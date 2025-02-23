import moment from "moment-timezone";
export const dateConverter = (utc, timezone, local) => {
  function parseTimeOffset(utc, timezone) {
    const utcOffsetInMinutes = moment.tz(timezone).utcOffset();
    let minute = utcOffsetInMinutes;
    const utcTimeString = utc;
    const utcDate = new Date(utcTimeString);

    const offsetMinutes = minute;
    utcDate.setUTCMinutes(utcDate.getUTCMinutes() + offsetMinutes);
    const adjustedTimeString = utcDate.toISOString();
    return adjustedTimeString;
  }

  if (timezone) parseTimeOffset(utc, timezone);

  function formatDate(date, local) {
    const today = new Date();
    const targetDate = new Date(date);
    if (
      today.getDate() === targetDate.getDate() &&
      today.getMonth() === targetDate.getMonth() &&
      today.getFullYear() === targetDate.getFullYear()
    ) {
      return "today";
    }
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (
      yesterday.getDate() === targetDate.getDate() &&
      yesterday.getMonth() === targetDate.getMonth() &&
      yesterday.getFullYear() === targetDate.getFullYear()
    ) {
      return "yesterday";
    }
    local = local ? local : "en-GB";
    const options = { day: "numeric", month: "long", year: "numeric" };
    return targetDate.toLocaleDateString(local, options);
  }

  return formatDate(utc, local);
};
