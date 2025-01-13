
#include <ESPAsyncWebServer.h>  //V3.6.0
#include <WebSocketsServer.h>
#include <SD.h>  //V1.3.0
#include <SPI.h>
#include <AsyncTCP.h>  //V1.1.4
#include "LittleFS.h"
#include <ArduinoJson.h>  //V7.3.0
#include "SdFat.h"        //V2.2.2
#include <time.h>

SdFat sd;
FatFile fafile;
SdFile sdfile;
#define SD_CS 27
#define SD_SCLK 14
#define SD_MOSI 12
#define SD_MISO 13

#define SD_CONFIG SdSpiConfig(SD_CS, USER_SPI_BEGIN, 1000000)
#define error(s) sd.errorHalt(F(s))

bool SD_present = false;
AsyncWebServer server(80);
WebSocketsServer websockets(81);
JsonDocument dbfiles;
File file;
uint16_t year = 0;
uint8_t month = 0;
uint8_t day = 0;
uint8_t hour = 0;
uint8_t minute = 0;
uint8_t second = 0;
bool abort_upload = false;
// ==================================================HANDEL WEBSOCKET=========================================================

void sendtxt(String txt, uint8_t clientId) {
  Serial.println(txt);
  websockets.sendTXT(clientId, txt);
}
void webSocketEvent(uint8_t clientId, WStype_t type, uint8_t *payload, size_t length) {
  if (type == WStype_CONNECTED) {
    IPAddress ip = websockets.remoteIP(clientId);
    Serial.printf("[%u] Connected from %d.%d.%d.%d\n", clientId, ip[0], ip[1], ip[2], ip[3]);
  } else if (type == WStype_TEXT) {
    String receivedPayload((char *)payload, length);
    Serial.printf("Received from client [%u]: %s\n", clientId, receivedPayload.c_str());
    DynamicJsonDocument message(1024);
    DeserializationError error = deserializeJson(message, receivedPayload);

    if (error) {
      Serial.print(F("deserializeJson() failed: "));
      Serial.println(error.f_str());
      return;
    }
    String path = message["path"];
    if (message.containsKey("path") && message["action"] == "sendJson") {
      sendJson(clientId, message["path"]);
    }
    if (message["action"] == "abort_upload" || message["action"] == "Delete") {
      Serial.println();
      Serial.println("====================Requested Delete=========================");
      Serial.println();
      file.close();
      if (SD.exists(path)) {
        if (SD.remove(path)) {
          Serial.printf("Deleting %s status: SUCCESS\n", path);
          sendJson(clientId, message["folder_path"]);
        } else {
          Serial.printf("Deleting %s status: FAILED\n", path);
        }
      } else {
        Serial.printf("File %s does not exist\n", path);
      }
    } else if (message["action"] == "Rename") {
      String folder_path = message["folder_path"];
      String file_action_parameter = message["file_action_parameter"];
      Serial.printf("Renaming file %s to %s\n", path, file_action_parameter);
      if (SD.rename(path, file_action_parameter)) {
        Serial.println("File renamed");
        sendJson(clientId, folder_path);
      } else {
        Serial.println("Rename failed");
      }
    }
  }
}
void sendJson(uint8_t clientId, String dirpath) {
  StaticJsonDocument<2048> jsonDoc;
  buildJson(dirpath, jsonDoc);
  String jsonString;
  serializeJson(jsonDoc, jsonString);
  sendtxt(jsonString, clientId);
}
void buildJson(const String &path, JsonDocument &jsonDoc) {
  JsonArray array = jsonDoc.createNestedArray(path);

  File dir = SD.open(path);
  if (!dir) {
    Serial.println("Failed to open directory");
    return;
  }

  File file = dir.openNextFile();
  while (file) {
    if (file.isDirectory()) {
      if (String(file.name()) != "System Volume Information") {
        JsonObject folder = array.createNestedObject();
        folder["folder"] = path + file.name();
        buildJson(path + file.name() + "/", jsonDoc);
      }
    } else {
      String fileName = file.name();
      if (fileName.length() > 0 && file.size() > 0) {
        JsonObject fileInfo = array.createNestedObject();
        fileInfo["filename"] = fileName;
        fileInfo["size"] = file.size();
        String extension = "";
        int lastDotIndex = fileName.lastIndexOf('.');
        int lastUnderscoreIndex = fileName.lastIndexOf('#');

        if (lastDotIndex != -1) {
          extension = fileName.substring(lastDotIndex + 1);
        }

        if (extension != "zip") {
          fileInfo["extension"] = extension;
        } else {
          int secondLastUnderscoreIndex = (lastUnderscoreIndex != -1) ? fileName.lastIndexOf('#', lastUnderscoreIndex - 1) : -1;
          if (lastUnderscoreIndex != -1 && secondLastUnderscoreIndex != -1) {
            fileInfo["extension"] = fileName.substring(secondLastUnderscoreIndex + 1, lastUnderscoreIndex);

          } else {
            fileInfo["extension"] = extension;
          }
        }
        // Serial.print("Attempting to open file: ");
        // Serial.println(file.path());
        fafile.close();
        if (!fafile.open(file.path(), O_READ)) {
          Serial.println("open file in buildejson funct failed");
        }
        fileInfo["creation_date"] = getTimestamps(fafile, true);
        fileInfo["modified_date"] = getTimestamps(fafile, false);
      }
    }
    file = dir.openNextFile();
  }
  dir.close();
}

// ==================================================HANDEL UPLOAD============================================================

void formatTimestamp(char *buffer, size_t size, uint16_t date, uint16_t time) {
  uint8_t day = date & 0x1F;
  uint8_t month = (date >> 5) & 0x0F;
  uint16_t year = 1980 + ((date >> 9) & 0x7F);
  uint8_t hours = (time >> 11) & 0x1F;
  uint8_t minutes = (time >> 5) & 0x3F;

  snprintf(buffer, size, "%02d-%02d-%04d %02d:%02d", day, month, year, hours, minutes);
}
bool parseDate(const char *dateStr) {
  int d, m, y, h, min, s;
  if (sscanf(dateStr, "%2d-%2d-%4d %2d:%2d:%2d", &d, &m, &y, &h, &min, &s) != 6) {
    return false;
  }
  day = static_cast<uint8_t>(d);
  month = static_cast<uint8_t>(m);
  year = static_cast<uint16_t>(y);
  hour = static_cast<uint8_t>(h);
  minute = static_cast<uint8_t>(min);
  second = static_cast<uint8_t>(s);
  return true;
}
String getTimestamps(FatFile &f, bool isCreation) {
  uint16_t date, time;
  if (isCreation ? f.getCreateDateTime(&date, &time) : f.getModifyDateTime(&date, &time)) {
    char timestamp[20];
    formatTimestamp(timestamp, sizeof(timestamp), date, time);
    return String(timestamp);
  } else {
    Serial.println(isCreation ? "Failed to get creation date and time." : "Failed to get modified date and time.");
    return "";
  }
  f.close();
}
void handleFileUpload(AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final) {
  if (index == 0) {
    Serial.println();
    Serial.println("====================Requested Upload=========================");
    Serial.println();
    Serial.printf("UploadStart: %s\n", filename.c_str());
    file = SD.open("/" + filename + ".zip", FILE_WRITE);
    if (!file) {
      Serial.println("Failed to open file for writing");
      return;
    }
  }
  if (file) {
    file.write(data, len);
  } else {
    Serial.println("Failed to open file for writing");
    return;
  }
  if (final) {
    Serial.printf("UploadEnd: %s\n", filename.c_str());
    file.close();
    if (filename == "file_data.json") {
      DynamicJsonDocument doc(1024);
      DeserializationError error = deserializeJson(doc, String((char *)data, len));
      if (error) {
        Serial.println("Failed to parse JSON metadata");
        Serial.println(error.c_str());
        return;
      }

      String tragetfile = doc["filename"];
      const char *creation_date = doc["creation_date"];
      const char *modified_date = doc["modified_date"];
      SdFile::dateTimeCallbackCancel();

      // ===================================================DATE SETTINNG=================================================
      sdfile.close();
      if (!parseDate(creation_date)) {
        Serial.println("Failed to parse modified date");
        return;
      }
      if (sdfile.open((tragetfile + ".zip").c_str(), O_WRITE)) {
        if (!sdfile.timestamp(T_CREATE, year, month, day, hour, minute, second)) {
          Serial.println("Failed to set creation date");
        }
        sdfile.close();
      } else {
        Serial.println("Failed to reopen file for setting creation date");
      }
      if (!parseDate(modified_date)) {
        Serial.println("Failed to parse modified date");
        return;
      }
      if (sdfile.open((tragetfile + ".zip").c_str(), O_WRITE)) {
        if (!sdfile.timestamp(T_WRITE, year, month, day, hour, minute, second)) {
          Serial.print("Failed to set modification date, error code: ");
        }
        sdfile.close();
      } else {
        Serial.println("Failed to reopen file for setting modification date");
      }

      Serial.println("=====================================");
      Serial.println("Metadata received:");
      Serial.println("=====================================");
      Serial.println("tragetfile: " + String(tragetfile));
      Serial.println("creation_date: " + String(creation_date));
      Serial.println("modified_date: " + String(modified_date));
      request->send(200, "text/plain", "Upload Sucess");
      if (SD.exists("/file_data.json.zip")) {
        SD.remove("/file_data.json.zip");
      }
    }
  }
}
// ==================================================HANDEL DOWNLOAD==========================================================

String getMimeType(String filename) {
  if (filename.endsWith(".html")) return "text/html";
  else if (filename.endsWith(".htm")) return "text/html";
  else if (filename.endsWith(".css")) return "text/css";
  else if (filename.endsWith(".js")) return "application/javascript";
  else if (filename.endsWith(".json")) return "application/json";
  else if (filename.endsWith(".png")) return "image/png";
  else if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "image/jpeg";
  else if (filename.endsWith(".gif")) return "image/gif";
  else if (filename.endsWith(".svg")) return "image/svg+xml";
  else if (filename.endsWith(".pdf")) return "application/pdf";
  else if (filename.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  else if (filename.endsWith(".zip")) return "application/zip";
  else return "application/octet-stream";  // Default for unknown types
}


// ==================================================SETUP & LOOP==========================================================


void setup() {
  Serial.begin(115200);
  if (!LittleFS.begin()) {
    Serial.println("An error has occurred while mounting LittleFS");
  } else {
    Serial.println("LittleFS mounted successfully");
  }
  SPI.begin(SD_SCLK, SD_MISO, SD_MOSI, SD_CS);
  SPI.setFrequency(1000000);
  while (!SD.begin(SD_CS)) {
    SPI.begin(SD_SCLK, SD_MISO, SD_MOSI, SD_CS);
    Serial.println("Searching for sd card..");
  }
  if (!sd.begin(SD_CONFIG)) {
    sd.initErrorHalt(&Serial);
  }

  Serial.println("Card initialised... file access enabled...");
  SD_present = true;

  WiFi.softAP("AURA", "12345678");
  IPAddress IP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(IP);
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(LittleFS, "/index.html", "text/html", false);
  });
  server.on("/test", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(LittleFS, "/test.html", "text/html", false);
  });
  server.serveStatic("/", LittleFS, "/");
  server.on(
    "/handleupload", HTTP_POST, [](AsyncWebServerRequest *request) {},
    [](AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final) {
      handleFileUpload(request, filename, index, data, len, final);
    });
  server.on(
    "/delete", HTTP_POST, [](AsyncWebServerRequest *request) {  // Acknowledge receipt
    },
    NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
      Serial.println();
      Serial.println("====================Requested Delete=========================");
      Serial.println();
      DynamicJsonDocument del(1024);  // Use a more descriptive name
      DeserializationError error = deserializeJson(del, data);
      if (error) {
        Serial.println("Failed to parse JSON");
        request->send(400, "application/json", "{\"status\":\"error\", \"message\":\"Invalid JSON\"}");
        return;  // Exit if JSON parsing fails
      }
      const char *path = del["path"];  // Get the path from the JSON
      if (SD.exists(path)) {
        if (SD.remove(path)) {
          Serial.printf("Deleting %s status: SUCCESS\n", path);
          request->send(200, "application/json", "{\"status\":\"success\", \"message\":\"File deleted\"}");
        } else {
          Serial.printf("Deleting %s status: FAILED\n", path);
          request->send(500, "application/json", "{\"status\":\"error\", \"message\":\"File deletion failed\"}");
        }
      } else {
        Serial.printf("File %s does not exist\n", path);
      }
    });
  server.begin();
  websockets.begin();
  websockets.onEvent(webSocketEvent);
}

void loop() {
  websockets.loop();
}