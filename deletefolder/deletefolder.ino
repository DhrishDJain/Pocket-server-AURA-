#include <SD.h>
#include <SPI.h>
#define SD_CS 27
#define SD_SCLK 14
#define SD_MOSI 12
#define SD_MISO 13

void removeDir(fs::FS &fs, const String dirname) {
  Serial.printf("Listing directory: %s\n", dirname);

  File root = fs.open(dirname);
  if (!root) {
    Serial.println("Failed to open directory");
    return;
  }
  if (!root.isDirectory()) {
    Serial.println("Not a directory");
    return;
  }

  File file = root.openNextFile();
  while (file) {
    if (file.isDirectory()) {
      Serial.print("  DIR : ");
      Serial.println(file.path());
      removeDir(SD, file.path());
    } else {
      Serial.print("DELETING FILE: ");
      Serial.println(file.path());
      if (SD.remove(file.path())) {
        Serial.println("SUCCES");
      } else {
        Serial.println("deleting file failed");
      }
    }
    file = root.openNextFile();
  }
  Serial.printf("Removing Dir: %s\n", dirname);
  if (fs.rmdir(dirname)) {
    Serial.println("Dir removed");
  } else {
    Serial.println("rmdir failed");
  }
}
void setup() {
  Serial.begin(115200);
  SPI.begin(SD_SCLK, SD_MISO, SD_MOSI, SD_CS);
  while (!SD.begin(SD_CS)) {
    SPI.begin(SD_SCLK, SD_MISO, SD_MOSI, SD_CS);
    Serial.println("Searching for sd card..");
  }
  Serial.println("SD card initialized.");
  removeDir(SD, "/tes3");
  if (SD.exists("/tes3/")) {
    Serial.println("newfile.txt exists.");
  } else {
    Serial.println("newfile.txt does not exist.");
  }
}

void loop() {
  // Nothing to do here
}