
#include <SPI.h>
// #include <SD.h>
#include "SdFat.h"
#include "sdios.h"
SdFat sd;
FatFile fafile;
#define SD_CS 27
#define SD_SCLK 14
#define SD_MOSI 12
#define SD_MISO 13
#define SD_CONFIG SdSpiConfig(SD_CS, USER_SPI_BEGIN, 1000000)
#define error(s) sd.errorHalt(F(s))
uint16_t creation_year;
uint16_t modified_year;
uint8_t creation_month, creation_day, creation_hours, creation_minutes;
uint8_t modified_month, modified_day, modified_hours, modified_minutes;
void printTimestamps(FatFile& f) {
  f.close();
  uint16_t creation_date, creation_time;
  uint16_t modified_date, modified_time;
  if (fafile.getCreateDateTime(&creation_date, &creation_time)) {
    creation_day = creation_date & 0x1F;
    creation_month = (creation_date >> 5) & 0x0F;
    creation_year = 1980 + ((creation_date >> 9) & 0x7F);
    creation_hours = (creation_time >> 11) & 0x1F;
    creation_minutes = (creation_time >> 5) & 0x3F;
  } else {
    Serial.println("Failed to get creation date and time.");
  }
  if (fafile.getModifyDateTime(&modified_date, &modified_time)) {
    modified_day = modified_date & 0x1F;
    modified_month = (modified_date >> 5) & 0x0F;
    modified_year = 1980 + ((modified_date >> 9) & 0x7F);
    modified_hours = (modified_time >> 11) & 0x1F;
    modified_minutes = (modified_time >> 5) & 0x3F;
  } else {
    Serial.println("Failed to get modified date and time.");
  }
  f.close();
}
void setup(void) {
  Serial.begin(115200);
  SPI.begin(SD_SCLK, SD_MISO, SD_MOSI, SD_CS);
  SPI.setFrequency(1000000);
  if (!sd.begin(SD_CONFIG)) {
    sd.initErrorHalt(&Serial);
  }
  if (!fafile.open("adr/ziptest_client_to_server.ino", O_READ)) {
    error("open default.txt failed");
  }
  printTimestamps(fafile);
  Serial.print("Creation Date: ");
  Serial.print(creation_day);
  Serial.print("-");
  Serial.print(creation_month);
  Serial.print("-");
  Serial.println(creation_year);
  Serial.print("Creation Time: ");
  Serial.print(creation_hours);
  Serial.print(":");
  Serial.println(creation_minutes);
  Serial.println();
  Serial.print("modified Date: ");
  Serial.print(modified_day);
  Serial.print("-");
  Serial.print(modified_month);
  Serial.print("-");
  Serial.println(modified_year);
  Serial.print("modified Time: ");
  Serial.print(modified_hours);
  Serial.print(":");
  Serial.println(modified_minutes);

  SdFile::dateTimeCallbackCancel();
  // create a new fafile with default timestamps
  if (!fafile.open("/nikl1#png#.zip", O_WRITE)) {
    error("open stamp.txt failed");
  }
  // set creation date time
  if (!fafile.timestamp(T_CREATE, 2014, 8, 10, 1, 2, 3)) {
    error("set create time failed");
  }
  // set write/modification date time
  if (!fafile.timestamp(T_WRITE, 2014, 10, 5, 22, 14, 6)) {
    error("set write time failed");
  }
  // set access date
  if (!fafile.timestamp(T_ACCESS, 2014, 11, 12, 7, 8, 9)) {
    error("set access time failed");
  }
  Serial.println("\nTimes after timestamp() calls\n");
  printTimestamps(fafile);

  fafile.close();
  Serial.println("\nDone\n");
}

void loop() {}