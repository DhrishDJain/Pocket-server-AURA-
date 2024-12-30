
#define SD_CS 27
#define SD_SCLK 14
#define SD_MOSI 12
#define SD_MISO 13
#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <SD.h>
#include <SPI.h>

#include <ArduinoJson.h>
#include "LittleFS.h"
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
        const char *date = doc["date"];
        const char *extension = doc["extension"];
        const char *path = doc["path"];

        Serial.println("Metadata received:");
        Serial.println("Date: " + String(date));
        Serial.println("Extension: " + String(extension));
        Serial.println("Path: " + String(path));
      } else {
        Serial.println("Failed to parse JSON metadata");
      }
      delay(1000);
      request->redirect("/");
    }
  }
}

void setup() {
  Serial.begin(115200);
  WiFi.softAP(ssid, password);  // Create a WiFi access point
  Serial.println("Access Point started");
  Serial.print("IP Address: ");
  Serial.println(WiFi.softAPIP());
  SPI.begin(SD_SCLK, SD_MISO, SD_MOSI, SD_CS);

  // Initialize SD card
  if (!SD.begin(SD_CS)) {
    Serial.println("SD Card Mount Failed");
    return;
  }
  if (!LittleFS.begin()) {
    Serial.println("An error has occurred while mounting LittleFS");
  } else {
    Serial.println("LittleFS mounted successfully");
  }
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(LittleFS, "/index.html", "text/html", false);
  });

  server.serveStatic("/", LittleFS, "/");
  // server.on("/handleupload", HTTP_POST, handleFileUpload);
  server.on(
    "/handleupload", HTTP_POST, [](AsyncWebServerRequest *request) {},
    [](AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final) {
      handleFileUpload(request, filename, index, data, len, final);
    });

  server.begin();
  Serial.println("Server started");
}




void loop() {
  // Nothing here
}