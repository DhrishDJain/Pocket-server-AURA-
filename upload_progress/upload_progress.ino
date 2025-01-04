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
SdFile sdfile;
File file;

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
uint16_t year = 0;
uint8_t month = 0;
uint8_t day = 0;
uint8_t hour = 0;
uint8_t minute = 0;
uint8_t second = 0;

const char *ssid = "ESP32 Offline Server";
const char *password = "password";
File file;  // Declare the file handle globally
AsyncWebServer server(80);
void handleFileUpload(AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final) {
  if (index == 0) {
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
    request->send(500, "text/plain", "Failed to open file for writing");
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
    }
  }
}

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
  server.on("/readstorage", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(200, "text/plain", "SD card read");
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
  // Nothing here
}