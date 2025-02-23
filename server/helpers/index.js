export const blockMessage = (user, friend) => null
  // updateFriend(
  //   {
  //     $or: [
  //       { sourceId: user, targetId: friend },
  //       { sourceId: friend, targetId: user },
  //     ],
  //   },
  //   { $addToSet: { messageblock: friend } }
  // );

export const leaveGroup = (user, group) => null
  // updateGroupUserData(
  //   { user: user, group: group },
  //   { status: USER_STATUS.inactive }
  // );
