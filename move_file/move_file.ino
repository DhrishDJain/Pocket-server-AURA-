#include <SD.h>
#include <SPI.h>
#define SD_CS 27
#define SD_SCLK 14
#define SD_MOSI 12
#define SD_MISO 13

void setup() {
  Serial.begin(115200);
  SPI.begin(SD_SCLK, SD_MISO, SD_MOSI, SD_CS);
  // Initialize the SD card
  while (!SD.begin(SD_CS)) {
    SPI.begin(SD_SCLK, SD_MISO, SD_MOSI, SD_CS);
    Serial.println("Searching for sd card..");
  }
  Serial.println("SD card initialized.");


  // Rename the file
  if (SD.rename("/t132#pdf#.zip", "/test/insider/t132#pdf#.zip")) {
    Serial.println("File renamed successfully.");
  } else {
    Serial.println("Error renaming file.");
  }

  // Check if the new file exists
  if (SD.exists("/insider/test/t132#pdf#.zip")) {
    Serial.println("newfile.txt exists.");
  } else {
    Serial.println("newfile.txt does not exist.");
  }
}

void loop() {
  // Nothing to do here
}