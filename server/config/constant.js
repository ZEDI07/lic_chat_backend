import { SERVER_URL } from "./index.js";
export const currDir = `${SERVER_URL}/public/assets`;

export const defaultPeopleImg = `${SERVER_URL}/public/assets/defaultPeopleAvatar.png`;
export const defaultGroupImg = `${SERVER_URL}/public/assets/defaultGroupAvatar.png`

export const STATUS_CODE = Object.freeze({
  success: 200,
  bad_request: 400,
  unauthorized: 401,
  server_error: 500,
  already_exists: 409,
});

export const REPORT_TYPE = Object.freeze({
  message: 1,
  user: 2,
  group: 3,
});

export const ROLE_CODE = Object.freeze({
  superadmin: "1",
  admin: "2",
  moderators: "3",
  default: "4",
});

export const USER_STATUS = Object.freeze({
  inactive: 0,
  active: 1,
  deleted: 2,
  pending: 3,
});

export const GROUP_TYPE = Object.freeze({
  public: 1,
  password_protected: 2,
  private: 3,
});

export const FRIENDSHIP_STATUS = Object.freeze({
  unfriend: 0,
  accepted: 1,
  pending: 2,
  rejected: 3,
  unknown: 4,
});

export const STORAGE_TYPE = Object.freeze({
  local_storage: "local_storage",
  amazon_s3: "amazon_s3",
  amazon_s3_compatible_storage: "amazon_s3_compatible_storage",
  digital_ocean_space: "digital_ocean_space",
  virtual_file_system: "virtual_file_system",
  wasabi_cloud_storage: "wasabi_cloud_storage",
});

export const STORAGE_TYPE_NAME = Object.freeze({
  local_storage: "Local Storage",
  amazon_s3: "Amazon S3",
  amazon_s3_compatible_storage: "Amazon S3 Compatible Storage",
  digital_ocean_space: "Digital Ocean Space",
  virtual_file_system: "Virtual File System",
  wasabi_cloud_storage: "Wasabi Cloud Storage",
});

export const FILE_TYPE = Object.freeze({
  file: "file",
  sticker: "sticker",
  reaction: "reaction",
  wallpaper: "wallpaper",
  media: "media",
});

export const CONTENT_TYPE = Object.freeze({
  text: "text",
  image: "image",
  video: "video",
  audio: "audio",
  gif: "gif",
  location: "location",
  sticker: "sticker",
  forwarded: "forwarded",
  application: "application",
  deleted: "deleted",
  contact: "contact",
  link: "link",
  notification: "notification",
  poll: "poll",
  hidden: "hidden",
  audioCall: "audiocall",
  videoCall: "videocall"
});

export const MESSAGE_STATUS = Object.freeze({
  notify: 0,
  sent: 1,
  received: 2,
  seen: 3,
  seenOff: 4, // for user read receipt is off in privacy
  deletedEveryone: 5,
  deletedByAdmin: 6,
});

export const RECEIVER_TYPE = Object.freeze({
  user: "user",
  group: "group",
});

export const CALL_TYPE = Object.freeze({
  audio: "audio",
  video: "video",
});

export const CALL_STATUS = Object.freeze({
  initiated: 1,
  connecting: 2,
  ringing: 3,
  incoming: 4,
  accepted: 5,
  rejected: 6,
  ended: 7,
  busy: 8,
});

export const CALL_DIRECTION = Object.freeze({
  incoming: "incoming",
  outgoing: "outgoing",
});

export const SOCKET_EVENTS = Object.freeze({
  chat_archived: "chat_archived",
  message_deleted_everyone: "message_deleted_everyone",
  message_deleted: "message_deleted",
  chat_deleted: "chat_deleted",
  message_received: "message_received",
  message_seen: "message_seen",
  message_starred: "message_starred",
  new_message: "new_message",
  user_status: "user_status",
  user_action: "user_action",
  new_message_admin: "new_message_admin",
  message_reaction: "messsage_reaction",
  message_edited: "message_edited",
  location_update: "location_update",
  get_active_locations: "get_active_locations",
  group_updates: "group_updates",
  chat_mute: "chat_mute",
  chat_pin: "chat_pin",
  chat_block: "chat_block",
  blocked_me: "blocked_me",
  chat_read: "chat_read",
  chat_unread: "chat_unread",
  unread_count: "unread_count",
  poll_update: "poll_update",
  chat_open: "chat_open",
  new_story: "new_story",
  story_ended: "story_ended",
  story_seen: "story_seen",
  wallpaper_changed: "wallpaper_changed",
  permission_updated: "permission_updated",
  privacy_update: "privacy_update",
  initiateCall: "initiate_call",
  notification: "notification",
  call: "call",
  message_update: "message_update"
});

export const PRIVACY_STATUS = Object.freeze({
  nobody: 0,
  friends: 1,
  // "Friends Except" : 2,
  everyone: 3,
});

export const ONLINE_PRIVACY = Object.freeze({
  everyone: 0,
  sameAs: 1,
});

export const SCREEN_LOCK = Object.freeze({
  immediately: { key: 0, text: "Immediately" },
  min1: { key: 1, text: "After 1 Minute" },
  min15: { key: 2, text: "After 15 Minute" },
  hr1: { key: 3, text: "After 1 Hours" },
});

export const LOCATION_TYPE = Object.freeze({
  location: "location",
  live_location: "live_location",
});

export const LOCATION_STATUS = Object.freeze({
  ended: 0,
  live: 1,
});

export const USER_ACTION = Object.freeze({
  typing: "typing",
  audio_record: "recording",
});

export const BLOCK_TYPE = Object.freeze({
  message: "message",
  user: "user",
});

export const MEMBER_GROUP_ROLE = Object.freeze({
  superAdmin: 1,
  admin: 2,
  member: 3,
});

export const MUTE_DURATION = Object.freeze({
  never: 1,
  eight: 2,
  week: 3,
});

export const GENERAL_SETTING_KEY = Object.freeze({
  setup_complete: "setup_complete",
  one_signal: "one_signal",
  image_setting: "image_setting",
  messaging_setting: "messaging_setting",
  domain: "domain",
  agora: "agora",
  auto_delete_attachment: "auto_delete_attachment",
  group: "group",
});

export const STORIES_CONTENT_TYPE = Object.freeze({
  text: "text",
  video: "video",
  image: "image",
});

export const SHOW_STORIES = Object.freeze({
  friends: "friends",
  onlySelected: "only_selected",
});

export const NOTIFICATION_ACTION = Object.freeze({
  block: "block",
  unblock: "unblock",
  newGroup: "created",
  added: "added",
  left: "left",
  removed: "removed",
  group_edited: "edited",
  group_deleted: "deleted",
  made_admin: "admin",
  dismiss_admin: "dismiss_admin",
  group_setting_changed: "setting_changed",
  joined: "joined",
});

export const VIEW_MORE = Object.freeze({
  chats: "chats",
  messages: "messages",
  starred: "starred",
});

export const MESSAGING_SETTING = Object.freeze({
  everyone: 1,
  friends: 2,
});

export const DEFAULT_ABOUT = [
  "Available",
  "Busy",
  "At the school",
  "At work",
  "In a meeting",
  "At the gym",
];

export const CALL_MODE = {
  incoming: "incoming",
  outgoing: "outgoing"
}

export const CALL = Object.freeze({
  new_call: "new_call",
  received: "received",
  accept: "accept",
  ended: "ended",
  rejected: "rejected",
  join: "join",
  switch: "switch",
  approved: "approved"
})

export const PERMISSION = Object.freeze({
  start_audio_call: "start_audio_call",
  start_video_call: "start_video_call",
  share_location: "share_location",
  share_contacts: "share_contacts",
  share_poll: "share_poll",
  share_document: "share_document",
  share_photos_and_videos: "share_photos_and_videos",
  record_and_send_audio: "record_and_send_audio",
  allow_edit_message: "allow_edit_message",
  create_groups: "create_groups",
});