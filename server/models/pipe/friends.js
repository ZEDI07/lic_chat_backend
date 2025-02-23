export const addBlockFields = (user) => ({
  $addFields: {
    blocked: {
      $cond: {
        if: {
          $and: [
            { $isArray: "$friends.messageblock" },
            { $in: ["$_id", "$friends.messageblock"] },
          ],
        },
        then: true,
        else: false,
      },
    },
    blockedMe: {
      $cond: {
        if: {
          $and: [
            { $isArray: "$friends.messageblock" },
            { $in: [user, "$friends.messageblock"] },
          ],
        },
        then: true,
        else: false,
      },
    },
  },
});

export const friendMatch = {
  $expr: {
    $or: [
      {
        $and: [
          {
            $eq: ["$sourceId", "$$user"],
          },
          {
            $eq: ["$targetId", "$$id"],
          },
        ],
      },
      {
        $and: [
          {
            $eq: ["$sourceId", "$$id"],
          },
          {
            $eq: ["$targetId", "$$user"],
          },
        ],
      },
    ],
  },
};
