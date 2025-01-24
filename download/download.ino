#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <SD.h>
#include <SPI.h>
#include "LittleFS.h"

#define SD_CS 27    // Chip Select pin
#define SD_SCLK 14  // Clock pin
#define SD_MOSI 12  // MOSI pin
#define SD_MISO 13  // MISO pin

AsyncWebServer server(80);

void setup() {
  Serial.begin(115200);
  WiFi.softAP("ESP32_AP", "password123");  // Change SSID and password as needed
  Serial.println("Access Point started");

  if (!LittleFS.begin()) {
    Serial.println("An error has occurred while mounting LittleFS");
  } else {
    Serial.println("LittleFS mounted successfully");
  }

  SPI.begin(SD_SCLK, SD_MISO, SD_MOSI, SD_CS);
  SPI.setFrequency(1000000);
  while (!SD.begin(SD_CS)) {
    SPI.begin(SD_SCLK, SD_MISO, SD_MOSI, SD_CS);
    Serial.println("Searching for SD card...");
  }
  Serial.println("SD Card initialized.");

  // Serve the homepage
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(LittleFS, "/index.html", "text/html", false);
  });

  // Download handler
  server.on("/download", HTTP_GET, [](AsyncWebServerRequest *request) {
    String filename = request->getParam("file")->value();
    filename.trim();
    Serial.println("Download handler started for: " + filename);

    // URL encode the filename

    File file = SD.open(filename, "r");
    if (!file) {
      Serial.println("File not found: " + filename);
      request->send(404, "text/plain", "File not found");
      return;
    }

    // Send the file in chunks
    AsyncWebServerResponse *response = request->beginResponse("application/octet-stream", file.size(), [file](uint8_t *buffer, size_t maxLen, size_t total) mutable -> size_t {
      size_t bytesRead = file.read(buffer, maxLen);
      if (bytesRead == 0) {
        file.close();  // Close the file when done reading
      }
      return bytesRead;
    });

    // Set the Content-Disposition header to specify the filename
    // response->addHeader("Content-Disposition", "attachment; filename=\"" + encodedFilename + "\"");
    response->addHeader("Server", "ESP Async Web Server");
    request->send(response);
  });

  server.begin();
  Serial.println("Server started");
}

void loop() {
  // Nothing to do here
}