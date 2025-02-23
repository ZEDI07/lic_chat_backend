import reportModel from "./schema/report.js";

export const newReport = async (body) => {
  try {
    const data = await reportModel.findOneAndUpdate(
      {
        user: body.user,
        report: body.report,
      },
      {
        message: body.message,
        reportType: body.reportType,
      },
      {
        upsert: true,
        new: true,
      }
    );
    if (!data) {
      return {
        success: false,
        message: "somthing went wrong while reporting",
      };
    }
    return { success: true, message: "Reported" };
  } catch (error) {
    return { success: false, message: error };
  }
};
