
#include <ESPAsyncWebServer.h>
#include <WebSocketsServer.h>
#include <SD.h>
#include <SPI.h>
#include <AsyncTCP.h>
#include "LittleFS.h"
#include <ArduinoJson.h>
#include "SdFat.h"
#include "sdios.h"
#include <time.h>

SdFat sd;
FatFile fafile;

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

void formatTimestamp(char *buffer, size_t size, uint16_t date, uint16_t time) {
  uint8_t day = date & 0x1F;
  uint8_t month = (date >> 5) & 0x0F;
  uint16_t year = 1980 + ((date >> 9) & 0x7F);
  uint8_t hours = (time >> 11) & 0x1F;
  uint8_t minutes = (time >> 5) & 0x3F;

  snprintf(buffer, size, "%02d-%02d-%04d %02d:%02d", day, month, year, hours, minutes);
}

String getTimestamps(FatFile &f, bool isCreation) {
  uint16_t date, time;
  if (isCreation ? f.getCreateDateTime(&date, &time) : f.getModifyDateTime(&date, &time)) {
    char timestamp[20];  // Sufficient size for the formatted string
    formatTimestamp(timestamp, sizeof(timestamp), date, time);
    return String(timestamp);
  } else {
    Serial.println(isCreation ? "Failed to get creation date and time." : "Failed to get modified date and time.");
    return "";  // Return an empty string on failure
  }
}
void webSocketEvent(uint8_t clientId, WStype_t type, uint8_t *payload, size_t length) {
  if (type == WStype_CONNECTED) {
    IPAddress ip = websockets.remoteIP(clientId);
    Serial.printf("[%u] Connected from %d.%d.%d.%d url: %s\n", clientId, ip[0], ip[1], ip[2], ip[3], payload);
    sendJson(clientId);
  }
}
void sendJson(uint8_t clientId) {
  StaticJsonDocument<2048> jsonDoc;
  buildJson("/", jsonDoc);
  String jsonString;
  serializeJson(jsonDoc, jsonString);
  sendtxt(jsonString, clientId);
  sendtxt("DONE", clientId);
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
        fafile.close();
        if (!fafile.open(file.path(), O_READ)) {
          error("open default.txt failed");
        }
        fileInfo["creation_date"] = getTimestamps(fafile, true);
        fileInfo["modified_date"] = getTimestamps(fafile, false);
      }
    }
    file = dir.openNextFile();
  }
  dir.close();
}
void sendtxt(String txt, uint8_t clientId) {
  Serial.println(txt);
  websockets.sendTXT(clientId, txt);
}
void initLittleFS() {
  if (!LittleFS.begin()) {
    Serial.println("An error has occurred while mounting LittleFS");
  } else {
    Serial.println("LittleFS mounted successfully");
  }
}
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
void handleFileUpload(AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final) {
  if (index == 0) {
    Serial.printf("UploadStart: %s\n", filename.c_str());
    file = SD.open("/" + filename + ".zip", FILE_WRITE);
    if (!file) {
      Serial.println("Failed to open file for writing");
      return;
    }
  }
  // Write the received data to the file
  if (file) {
    file.write(data, len);  // Write the data chunk
  } else {
    Serial.println("Failed to open file for writing");
    request->send(500, "text/plain", "Failed to open file for writing");
  }

  if (final) {  // If this is the last chunk
    Serial.printf("UploadEnd: %s\n", filename.c_str());
    file.close();
    if (filename == "file_data.json") {
      // Parse the JSON metadata
      DynamicJsonDocument doc(1024);
      DeserializationError error = deserializeJson(doc, String((char *)data, len));

      if (!error) {
        const char *creation_date = doc["creation_date"];
        const char *modified_date = doc["modified_date"];
        const char *extension = doc["extension"];
        const char *path = doc["path"];

        Serial.println();
        Serial.println("=====================================");
        Serial.println("Metadata received:");
        Serial.println("=====================================");
        Serial.println("creation_date: " + String(creation_date));
        Serial.println("modified_date: " + String(modified_date));
        Serial.println("Extension: " + String(extension));
        Serial.println("Path: " + String(path));
      } else {
        Serial.println("Failed to parse JSON metadata");
      }
      delay(1000);
    }
    file.close();
    request->redirect("/");
  }
}

void setup() {
  Serial.begin(115200);
  initLittleFS();
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

  server.serveStatic("/", LittleFS, "/");
  server.on(
    "/handleupload", HTTP_POST, [](AsyncWebServerRequest *request) {},
    [](AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final) {
      handleFileUpload(request, filename, index, data, len, final);
    });
  server.begin();
  websockets.begin();
  websockets.onEvent(webSocketEvent);
}

void loop() {
  websockets.loop();
}