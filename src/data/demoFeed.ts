import { addDaysKey, todayKey, zonedIso } from "../domain/format";

const ZONE = "Africa/Addis_Ababa";

type Stay = {
  external_uid: string;
  start: string;
  end: string;
  summary: string;
  guest_name: string;
  cancelled?: boolean;
};

function at(dayOffset: number, time: string) {
  return zonedIso(addDaysKey(todayKey(ZONE), dayOffset), time, ZONE);
}

function stay(
  id: string,
  guest: string,
  summary: string,
  startDay: number,
  startTime: string,
  endDay: number,
  endTime: string,
  cancelled = false,
): Stay {
  return {
    external_uid: id,
    guest_name: guest,
    summary,
    start: at(startDay, startTime),
    end: at(endDay, endTime),
    cancelled,
  };
}

function sampleReservations(): Stay[] {
  const stays = [
    stay("helen", "Helen Bekele", "Arrives today and leaves early Sunday", 0, "13:00", 1, "09:00"),
    stay("yonatan", "Yonatan Tesfaye", "Sunday day-use, 40 minutes after checkout", 1, "09:40", 1, "17:00"),
    stay("sara", "Sara Mengistu", "Late Sunday arrival, checkout before the morning shift", 1, "22:00", 3, "06:30"),
    stay("dawit", "Dawit Alemu", "One and a half hours to clean, shorter than the job", 3, "08:00", 4, "12:00"),
    stay("meron", "Meron Hailu", "Comfortable Thursday afternoon gap, Saturday checkout", 4, "19:00", 6, "10:00"),
    stay("kidus", "Kidus Assefa", "Fifteen-minute flip, then a stay through Monday night", 6, "10:15", 9, "23:30"),
    stay("cancelled-gap", "Cancelled hold", "A cancelled hold during the vacancy", 10, "12:00", 10, "18:00", true),
    stay("liya", "Liya Tadesse", "Check-in after a day and a half empty", 11, "11:00", 12, "11:00"),
    stay("henok", "Henok Gebre", "One hour between guests, then a two-hour day-use", 12, "12:00", 12, "14:30"),
    stay("selam", "Selam Worku", "Midweek stay ending exactly at the end of Friday's shift", 13, "09:00", 16, "17:00"),
    stay("bila", "Bilen Abebe", "Half an hour after hours, checkout before dawn Monday", 16, "17:30", 18, "05:00"),
    stay("ruth", "Ruth Desta", "Monday afternoon clean, one night", 18, "15:00", 19, "10:00"),
    stay("tomas", "Tomas Girma", "Back to back with the previous checkout, no gap", 19, "10:00", 19, "13:00"),
    stay("hana", "Hana Kebede", "Overnight gap, checkout Sunday evening", 20, "08:00", 22, "20:00"),
    stay("mikias", "Mikias Haile", "Empty Monday, then a short Tuesday stay", 24, "11:00", 25, "14:00"),
    stay("kalkidan", "Kalkidan Berhe", "Twenty-minute flip into an early Thursday checkout", 25, "14:20", 27, "08:45"),
    stay("naomi", "Naomi Fikru", "Long Thursday window, Sunday morning checkout", 27, "16:00", 30, "11:00"),
    stay("yonas", "Yonas Mulugeta", "Last guest, nobody booked after checkout", 30, "19:00", 34, "10:00"),
  ];
  const active = stays.filter((item) => !item.cancelled);
  for (let index = 1; index < active.length; index += 1) {
    if (active[index].start < active[index - 1].end) {
      throw new Error(`${active[index].external_uid} overlaps ${active[index - 1].external_uid}`);
    }
  }
  return stays;
}

export const demoFeed = {
  reservations: sampleReservations(),
};
