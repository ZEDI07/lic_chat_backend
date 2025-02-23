import { STATUS_CODE } from "../../config/constant.js";
import { handlePrivacyChange } from "../../helpers/user.js";
import { allBlockedFriends } from "../../models/friend.js";
import { allLiveLocations, allstarredMessages } from "../../models/message.js";
import * as services from "../../models/setting.js";
import { updateUserDetails, userInfo } from "../../models/user.js";
import { checkPermission } from "../../utils/checkPermission.js";
import { flattenObj } from "../../utils/common.js";
import * as validate from "../../validation/setting.js";

export const settings = async (req, res, next) => {
  try {
    const details = await services.settings({ user: req.user._id });
    if (details.success)
      return res.status(STATUS_CODE.success).json(details.data);
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: details.message });
  } catch (error) {
    next(error);
  }
};

export const privacySetting = async (req, res, next) => {
  const user = req.user;
  try {
    const details = await userInfo({ _id: req.user._id }, { privacy: 1 });
    const liveLocations = await allLiveLocations(req.user._id);
    const allBlockedFriend = await allBlockedFriends({ user: user._id });
    // let messageIds = [];
    liveLocations.data = liveLocations.data.map((msg) => {
      // messageIds.push(msg._id);
      return {
        _id: msg._id,
        endTime: msg.location.endTime,
        name: msg.user.name,
      };
    });
    if (details.success)
      return res.status(STATUS_CODE.success).json({
        privacy: details.data.privacy,
        liveLocations: liveLocations.data,
        allBlockedFriend: allBlockedFriend.data,
      });
    return res
      .status(STATUS_CODE.bad_request)
      .json({ success: false, message: details.message });
  } catch (error) {
    next(error);
  }
};

export const updatePrivacySetting = async (req, res, next) => {
  try {
    const { error } = validate.privacySetting(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });

    const readRecipt = req.body.readRecipts;
    if (readRecipt !== undefined) {
      const permCheck = await checkPermission(
        req,
        "enable_disable_read_receipts"
      );
      if (!permCheck)
        return res.status(STATUS_CODE.bad_request).json({
          success: false,
          message: "Not have permission to change read receipts",
        });
    }
    const update = flattenObj(req.body, "privacy");
    const details = await updateUserDetails(
      { _id: req.user._id },
      { $set: update }
    );
    if (details.success) {
      readRecipt == undefined &&
        handlePrivacyChange(details.data);
      return res
        .status(STATUS_CODE.success)
        .json({ success: true, message: "Privacy setting updated." });
    }
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: details.message });
  } catch (error) {
    next(error);
  }
};

export const notificationSetting = async (req, res, next) => {
  try {
    const details = await userInfo({ _id: req.user._id }, { notification: 1 });
    if (details.success) {
      return res.status(STATUS_CODE.success).json(details.data.notification);
    }
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: details.message });
  } catch (error) {
    next(error);
  }
};

export const updateNotificationSetting = async (req, res, next) => {
  try {
    const { error } = validate.notificationSetting(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: error.message });

    const update = flattenObj(req.body, "notification");
    const details = await updateUserDetails(
      { _id: req.user._id },
      { $set: update }
    );
    if (details.success) return res.status(STATUS_CODE.success).json({ message: "updated successfully" });
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: details.message });
  } catch (error) {
    next(error);
  }
};

export const accountSetting = async (req, res, next) => {
  try {
    const details = await userInfo({ _id: req.user._id }, { account: 1 });
    if (details.success) {
      return res.status(STATUS_CODE.success).json({ data: details.data });
    }
    return res
      .status(STATUS_CODE.bad_request)
      .json({ message: details.message });
  } catch (error) {
    next(error);
  }
};

export const aboutApp = async (req, res, next) => {
  try {
    let menu = {
      navigationTitle: t("Circuit Chat"),
      navigationDescription: t("version 2.0.2"),

      buttons: [
        {
          key: "helpCenter",
          label: "Help Center",
        },
        {
          key: "contactUs",
          label: "Contact Us",
        },
        {
          key: "termPriavcyPolicy",
          label: "Terms & Privacy Policy",
        },
        {
          key: "licenses",
          label: "Licenses",
        },
      ],
      description: t("© Circuit Chat LLC"),
    };

    return res.status(STATUS_CODE.success).json({ success: true, menu: menu });
  } catch (error) {
    next(error);
  }
};

export const starredMessage = async (req, res, next) => {
  try {
    const lastMessage = req.query.lastMessage;
    const limit = +req.query.limit || 15;
    const response = await allstarredMessages({
      user: req.user._id,
      lastMessage,
      limit: limit + 1,
    });
    if (!response.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: response.message });
    let more = false;
    if (response.data.length == limit + 1) {
      response.data.pop();
      more = true;
    }
    return res
      .status(STATUS_CODE.success)
      .json({ data: response.data, more: more });
  } catch (error) {
    next(error);
  }
};
