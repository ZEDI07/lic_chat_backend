function dateConverter(date) {
  const createdAt = new Date(date);
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    timeZone: "Asia/Kolkata",
  };
  const updatedDate = createdAt.toLocaleString("en-US", options);

  return updatedDate;
}
