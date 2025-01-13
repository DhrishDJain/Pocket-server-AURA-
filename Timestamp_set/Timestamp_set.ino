#include <SPI.h>
#include "SdFat.h"
SdFat sd;
SdFile sdfile;
#define SD_CS 27
#define SD_SCLK 14
#define SD_MOSI 12
#define SD_MISO 13

#define SD_CONFIG SdSpiConfig(SD_CS, USER_SPI_BEGIN, 1000000)
#define error(s) sd.errorHalt(F(s))

uint16_t year = 0;
uint8_t month = 0;
uint8_t day = 0;
uint8_t hour = 0;
uint8_t minute = 0;
uint8_t second = 0;

void printTimestamps(SdFile &f) {
  Serial.print("Creation: ");
  f.printCreateDateTime(&Serial);
  Serial.println();
  Serial.print("Modify: ");
  f.printModifyDateTime(&Serial);
  Serial.println();
}

bool parseDate(const char *dateStr) {
  // Temporary variables to hold parsed values
  int d, m, y, h, min, s;

  // Use sscanf to parse the date string directly
  if (sscanf(dateStr, "%2d-%2d-%4d %2d:%2d:%2d", &d, &m, &y, &h, &min, &s) != 6) {
    return false;  // Parsing failed
  }

  // Assign parsed values to global variables
  day = static_cast<uint8_t>(d);
  month = static_cast<uint8_t>(m);
  year = static_cast<uint16_t>(y);
  hour = static_cast<uint8_t>(h);
  minute = static_cast<uint8_t>(min);
  second = static_cast<uint8_t>(s);

  return true;  // Parsing succeeded
}

void setup() {
  Serial.begin(115200);
  SPI.begin(SD_SCLK, SD_MISO, SD_MOSI, SD_CS);
  SPI.setFrequency(1000000);
  if (!sd.begin(SD_CONFIG)) {
    sd.initErrorHalt(&Serial);
  }

  String filename = "css#svg#";  // Corrected filename
  const char *creation_date = "05-01-2025 20:34:55";
  const char *modified_date = "06-10-2024 15:39:58";  // Ensure this is a valid date
  SdFile::dateTimeCallbackCancel();

  if (!parseDate(creation_date)) {
    Serial.println("Failed to parse modified date");
    return;
  }
  if (sdfile.open(("/" + filename + ".zip").c_str(), O_WRITE)) {
    if (!sdfile.timestamp(T_CREATE, year, month, day, hour, minute, second)) {
      Serial.println("Failed to set creation date");
    }
    sdfile.close();
  } else {
    Serial.println("Failed to reopen file for setting creation date");
  }
  // Print the modified_date string for debugging

  // Parse the date string
  if (!parseDate(modified_date)) {
    Serial.println("Failed to parse modified date");
    return;
  }

  // Debug output for modification date
  Serial.printf("Setting mod date: %02u-%02u-%04u %02u:%02u:%02u\n", day, month, year, hour, minute, second);

  // Set the modification date
  if (sdfile.open(("/" + filename + ".zip").c_str(), O_WRITE)) {
    if (!sdfile.timestamp(T_WRITE, year, month, day, hour, minute, second)) {
      Serial.print("Failed to set modification date, error code: ");
      Serial.println(sd.sdErrorCode());  // Print the error code
    } else {
      printTimestamps(sdfile);
    }
    sdfile.close();
  } else {
    Serial.println("Failed to reopen file for setting modification date");
  }
  Serial.print("\nDone\n");
}
void loop() {}