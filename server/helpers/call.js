import { RtcTokenBuilder } from "agora-token";
import moment from "moment-timezone";
import mongoose from "mongoose";
import SocketConnection from "../../socket.js";
import { CALL, CALL_MODE, CALL_STATUS, CALL_TYPE, CONTENT_TYPE, RECEIVER_TYPE, SOCKET_EVENTS, USER_STATUS } from "../config/constant.js";
import { callInfo, callsStatus, countCalls, newCall, updateCallInfo } from "../models/call.js";
import { groupMembers } from "../models/group.js";
import { findMessages, messageInfo, updateMessage } from "../models/message.js";
import { userProject } from "../models/pipe/user.js";
import { userInfo } from "../models/user.js";
import Timer from "./timmer.js";
import { handlePushNotification } from "./message.js";

export const handleNewCall = async ({ channel, user, chat, callMode, agora, uid }) => {
    try {
        const expiryDuration = 1000 * 60 * 60;
        const token = RtcTokenBuilder.buildTokenWithUid(agora.id, agora.certificate, channel._id, uid, 1, expiryDuration, expiryDuration);
        const newcall = await newCall({ channel: channel._id, user, chat: chat._id, receiverType: channel.receiverType, callType: channel.contentType == CONTENT_TYPE.audioCall ? CALL_TYPE.audio : CALL_TYPE.video, callMode, status: callMode == CALL_MODE.outgoing ? CALL_STATUS.accepted : CALL_STATUS.initiated, joined: callMode == CALL_MODE.outgoing ? true : false, token })
        if (!newcall.success)
            return;
        SocketConnection.emitSocketEvent(`user_${user}`, SOCKET_EVENTS.call, { type: CALL.new_call, ...newcall.data.toJSON(), chat: chat, callDetails: channel, token });
        return newcall.data;
    } catch (error) {
        console.log('error while handling new call', error)
    }
};

// handle user recieved call and start ringing on his device.
export const handleCallRecived = async ({ user, chat, channel, receiverType }) => {
    try {
        if (receiverType == RECEIVER_TYPE.user) {
            const channelInfo = await updateMessage({ _id: channel }, { status: CALL_STATUS.ringing });
            if (!channelInfo.success)
                return;
            const callInitiator = await updateCallInfo({ channel, user: chat }, { status: CALL_STATUS.ringing })
            const callReceiver = await updateCallInfo({ channel, user: user }, { status: CALL_STATUS.incoming })
            // await updateCalls({ channel: channel }, { status: CALL_STATUS.ringing });
            SocketConnection.emitSocketEvent(`user_${chat}`, SOCKET_EVENTS.call, { type: CALL.received, ...callInitiator.data.toJSON() });
            SocketConnection.emitSocketEvent(`user_${user}`, SOCKET_EVENTS.call, { type: CALL.received, ...callReceiver.data.toJSON() });
        }
    } catch (error) {
        console.log("error in handle call recived", error)
    }
};

export const handleCallAccept = async ({ user, chat, channel, receiverType }) => {
    try {
        Timer.clear(channel);
        if (receiverType == RECEIVER_TYPE.user) {
            const channelInfo = await updateMessage({ _id: channel, receiverType }, { status: CALL_STATUS.accepted, startedAt: Date.now() });
            if (!channelInfo.success)
                return;
            const callInitiator = await updateCallInfo({ channel, user: chat }, { status: CALL_STATUS.accepted, })
            const callReceiver = await updateCallInfo({ channel, user: user }, { status: CALL_STATUS.accepted, joined: true })
            SocketConnection.emitSocketEvent(`user_${chat}`, SOCKET_EVENTS.call, { type: CALL.accept, ...callInitiator.data.toJSON(), chatId: user, callDetails: channelInfo.data });
            SocketConnection.emitSocketEvent(`user_${user}`, SOCKET_EVENTS.call, { type: CALL.accept, ...callReceiver.data.toJSON(), chatId: chat, callDetails: channelInfo.data });
        } else {
            const date = Date.now();
            const alreadyJoined = await callInfo({ channel, user, receiverType, joined: true });
            if (!alreadyJoined.success) {
                const channelInfo = await updateMessage({ _id: channel, receiverType }, { $inc: { joined: 1 } });
                const callReceiver = await updateCallInfo({ channel, user: user, receiverType }, { status: CALL_STATUS.accepted, startedAt: date, joined: true });
                console.log("call receiver details while accepted call", callReceiver)
                if (!callReceiver.success)
                    return;
                SocketConnection.emitSocketEvent(`user_${user}`, SOCKET_EVENTS.call, { type: CALL.accept, ...callReceiver.data.toJSON(), chatId: chat, callDetails: channelInfo.data });
            }
        }
    } catch (error) {
        console.log("error handle call accept", error)
    }
};

export const handleCallReject = async ({ user, chat, channel, receiverType }) => {
    try {
        if (receiverType == RECEIVER_TYPE.user) {
            Timer.clear(channel)
            const date = Date.now();
            const channelInfo = await updateMessage({ _id: channel, receiverType }, { status: CALL_STATUS.ended, endAt: date });
            if (!channelInfo.success)
                return;
            const callInitiator = await updateCallInfo({ channel, user: chat }, { status: CALL_STATUS.rejected })
            const callReceiver = await updateCallInfo({ channel, user: user }, { status: CALL_STATUS.rejected })
            handleCallUpdate({
                user: chat,
                message: channelInfo.data,
                call: { type: CALL.rejected, ...callInitiator.data.toJSON(), callDetails: channelInfo.data }
            });
            handleCallUpdate({
                user,
                message: channelInfo.data,
                call: { type: CALL.rejected, ...callReceiver.data.toJSON(), callDetails: channelInfo.data }
            })
        } else {
            const callReceiver = await updateCallInfo({ channel, user: user, receiverType }, { status: CALL_STATUS.rejected })
            if (!callReceiver.success)
                return;
            SocketConnection.emitSocketEvent(`user_${user}`, SOCKET_EVENTS.call, { type: CALL.rejected, ...callReceiver.data.toJSON() });
        }
    } catch (error) {
        console.log('error in handling call rejection', error)
    }
};

export const handleCallEnded = async ({ user, chat, channel, receiverType }) => {
    try {
        const date = Date.now();
        if (receiverType == RECEIVER_TYPE.user) {
            Timer.clear(channel)
            const channelInfo = await updateMessage({ _id: channel, receiverType }, { status: CALL_STATUS.ended, endAt: date });
            if (!channelInfo.success)
                return;
            const chatCallInfo = await updateCallInfo({ channel, user: chat, receiverType }, { status: CALL_STATUS.ended, disconnectAt: date });
            const userCallInfo = await updateCallInfo({ channel, user: user, receiverType }, { status: CALL_STATUS.ended, disconnectAt: date });
            if (!chatCallInfo || !userCallInfo)
                return
            handleCallUpdate({
                user: chat,
                message: channelInfo.data,
                call: { type: CALL.ended, ...chatCallInfo.data.toJSON(), callDetails: channelInfo.data }
            });
            handleCallUpdate({
                user,
                message: channelInfo.data,
                call: { type: CALL.ended, ...userCallInfo.data.toJSON(), callDetails: channelInfo.data }
            })
            if (String(channelInfo.data.sender) == String(user)) {
                const userData = await userInfo({ _id: user });
                const chatData = await userInfo({ _id: chat })
                handlePushNotification({ devicetokens: userData.data.devicetokens, chat: chatData.data, message: channelInfo.data })
            }
        } else {
            const callReceiver = await updateCallInfo({ channel, user: user, receiverType }, { status: CALL_STATUS.ended, disconnectAt: date })
            if (!callReceiver.success)
                return;
            SocketConnection.emitSocketEvent(`user_${user}`, SOCKET_EVENTS.call, { type: CALL.ended, ...callReceiver.data.toJSON() });
            const callDetails = await messageInfo({ _id: channel, status: CALL_STATUS.ended })
            if (!callDetails.success) {
                const activeCallUser = await countCalls({ channel, receiverType, status: CALL_STATUS.accepted });
                console.log("active users ", activeCallUser)
                if (!activeCallUser) {
                    const message = await updateMessage({ _id: channel, receiverType }, { endAt: date, status: CALL_STATUS.ended });
                    if (message.success) {
                        Timer.clear(channel)
                        const members = await groupMembers({ chat: new mongoose.Types.ObjectId(message.data.receiver), status: USER_STATUS.active });
                        for (let member of members) {
                            handleCallUpdate({
                                user: member._id,
                                message: message.data,
                                call: { type: CALL.ended, channel, callDetails: message.data }
                            })
                        }
                    }
                }
                if (activeCallUser < 2 && activeCallUser) {
                    const timeout = setTimeout(async () => {
                        const activeCallUser = await countCalls({ channel, receiverType, status: CALL_STATUS.accepted });
                        const activeuser = await callInfo({ channel, receiverType, status: CALL_STATUS.accepted })
                        if (activeCallUser < 2 && activeuser.success)
                            handleCallEnded({ receiverType, channel, user: activeuser.data.user, chat: activeuser.data.chat });
                    }, 1000 * 30);
                    Timer.add(channel, timeout)
                }
            }
        }
    } catch (error) {
        console.log("error handle call ended", error)
    }
}

export const handleCallJoin = async ({ user, chat, channel, receiverType }) => {
    try {
        const chatInfo = await userInfo({ _id: chat, receiverType: receiverType }, {
            ...userProject(),
            chatType: "$receiverType",
            enableCalling: {
                $cond: {
                    if: {
                        $and: [{ $eq: ["$receiverType", RECEIVER_TYPE.group] }, { $eq: ["$settings.member.call", false] }]
                    },
                    then: false,
                    else: true
                }
            }
        });
        if (!chatInfo.success || !chatInfo.data.enableCalling) return;
        const channelInfo = await messageInfo({ _id: channel, status: { $ne: CALL_STATUS.ended } });
        if (!channelInfo.success) return;
        Timer.clear(channel);
        if (receiverType == RECEIVER_TYPE.user) {
            const call = await updateCallInfo({ channel, user: user }, { status: CALL_STATUS.accepted, joined: true });
            if (!call.success) return
            const channelInfo = await updateMessage({ _id: channel, receiverType }, { status: CALL_STATUS.accepted, startedAt: Date.now() });
            if (!channelInfo.success)
                return;
            await updateCallInfo({ channel, user: chat }, { status: CALL_STATUS.accepted, })
            SocketConnection.emitSocketEvent(`user_${user}`, SOCKET_EVENTS.call, { type: CALL.new_call, ...call.data.toJSON(), chat: chatInfo.data, callDetails: channelInfo.data });
        } else {
            let joinerInfo = await callInfo({ channel, user, receiverType, joined: true });
            if (!joinerInfo.success) {
                joinerInfo = await updateCallInfo({ channel, user: user, receiverType }, { status: CALL_STATUS.accepted, startedAt: Date.now(), joined: true });
                if (!joinerInfo.success)
                    return;
                await updateMessage({ _id: channel, receiverType }, { $inc: { joined: 1 } });
            }
            SocketConnection.emitSocketEvent(`user_${user}`, SOCKET_EVENTS.call, { type: CALL.new_call, ...joinerInfo.data.toJSON(), chat: chatInfo.data, callDetails: channelInfo.data });
        }
    } catch (error) {
        console.log("error while joining call", error)
    }
}

export const handleCallUpdate = ({ user, message, call }) => {
    console.log("message and call update >>>")
    SocketConnection.emitSocketEvent(`user_${user}`, SOCKET_EVENTS.message_update, message);
    SocketConnection.emitSocketEvent(`user_${user}`, SOCKET_EVENTS.call, call);
}

export const handleActiveCall = async () => {
    const activeCalls = await findMessages({ contentType: { $in: [CONTENT_TYPE.audioCall, CONTENT_TYPE.videoCall] }, status: { $lt: CALL_STATUS.ended } })
    console.log("active calls", activeCalls);
    for (let call of activeCalls.data) {
        const { _id: channel, receiver: chat, receiverType, sender: user } = call;
        if (call.receiverType == RECEIVER_TYPE.user && call.status !== CALL_STATUS.accepted) {
            const duration = moment(call.createdAt).add(1, "minute").diff(moment(), "milliseconds");
            console.log("USER added duration", duration)
            const timeout = setTimeout(async () => {
                const query = { channel, status: CALL_STATUS.accepted };


                const callStatus = await callsStatus(query);
                if (callStatus.length < 2) {
                    handleCallEnded({ channel, chat, receiverType, user })
                }

            }, (duration));
            Timer.add(call._id, timeout);
        } else if (call.receiverType == RECEIVER_TYPE.group) {
            const query = { channel };
            const callStatus = await callsStatus(query);
            if (callStatus.filter(call => call.status == CALL_STATUS.accepted).length < 2) {
                const lastDisconnect = callStatus.filter(call => call.disconnectAt).sort((a, b) => new Date(b.disconnectAt) - new Date(a.disconnectAt)).slice(0, 1);
                console.log("last disconnected", lastDisconnect)
                const duration = moment(lastDisconnect?.disconnectAt || call.createdAt).add(1, "minute").diff(moment(), "milliseconds");
                console.log("GROUP added duration", duration)
                const timeout = setTimeout(() => {
                    callStatus.forEach(async call => {
                        await handleCallEnded({ channel, chat, receiverType, user: call.user })
                    })
                }, (duration));
                Timer.add(call._id, timeout)
            }
        }
    }
}

export const handleCallSwitch = async ({ user, chat, channel, receiverType }) => {
    try {
        console.log("inside calls switch", user, chat, channel, receiverType)
        if (receiverType == RECEIVER_TYPE.group)
            return;
        const channelInfo = await messageInfo({ _id: channel, receiverType, $or: [{ sender: user, receiver: chat }, { sender: chat, receiver: user }], status: CALL_STATUS.accepted, contentType: CONTENT_TYPE.audioCall });
        if (!channelInfo.success)
            return;
        SocketConnection.emitSocketEvent(`user_${chat}`, SOCKET_EVENTS.call, { type: CALL.switch, channel: channel, chat: user, receiverType })
    } catch (error) {
        console.log('error while call switch', error)
    }
}

export const handleSwitchApproved = async ({ user, chat, channel, receiverType }) => {
    try {
        console.log("inside switch approved", user, chat, channel, receiverType)
        if (receiverType == RECEIVER_TYPE.group)
            return;
        const channelInfo = await messageInfo({ _id: channel, receiverType, $or: [{ sender: user, receiver: chat }, { sender: chat, receiver: user }], status: CALL_STATUS.accepted, contentType: CONTENT_TYPE.audioCall });
        if (!channelInfo.success)
            return;
        // const channelInfo = await updateMessage({ _id: channel, receiverType }, { status: CALL_STATUS.accepted, startedAt: Date.now() });
        // if (!channelInfo.success)
        //     return;
        channelInfo.data.contentType = CONTENT_TYPE.videoCall;
        await channelInfo.data.save();
        const callInitiator = await updateCallInfo({ channel, user: chat, status: CALL_STATUS.accepted }, { callType: CALL_TYPE.video })
        const callReceiver = await updateCallInfo({ channel, user: user, status: CALL_STATUS.accepted }, { callType: CALL_TYPE.video });
        if (!callInitiator || !callReceiver)
            return
        handleCallUpdate({
            user: chat,
            message: channelInfo.data,
            call: { type: CALL.approved, channel, callType: CALL_TYPE.video }
        })
        handleCallUpdate({
            user,
            message: channelInfo.data,
            call: { type: CALL.approved, channel, callType: CALL_TYPE.video }
        })
    } catch (error) {
        console.log('error while call error switch', error)
    }
}