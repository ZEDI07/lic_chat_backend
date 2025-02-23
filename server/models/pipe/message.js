
import { MESSAGE_STATUS } from "../../config/constant.js";
import { userProject } from "./user.js";

export const mediaFilePipeline = [
  {
    $lookup: {
      from: "files",
      localField: "media",
      foreignField: "_id",
      pipeline: [
        {
          $match: {
            status: true,
          },
        },
        {
          $lookup: {
            from: "storages",
            localField: "serviceId",
            foreignField: "_id",
            pipeline: [
              {
                $match: {
                  status: true,
                  enabled: true,
                },
              },
            ],
            as: "storages",
          },
        },
        {
          $unwind: {
            path: "$storages",
            preserveNullAndEmptyArrays: false,
          },
        },
      ],
      as: "media",
    },
  },
  {
    $unwind: {
      path: "$media",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $addFields: {
      media: {
        $cond: {
          if: "$media",
          then: {
            $concat: ["$media.storages.credentials.cdn_url", "$media.url"],
          },
          else: "$media",
        },
      },
      mediaDetails: {
        createdAtMedia: "$media.createdAt",
        mediaSize: "$media.size",
        mimetype: "$media.mimetype",
        originalname: "$media.originalname",
      },
    },
  },
];

// Message Status Lookup

export const messageStatusValue = (message_status = "$message_status") => ({
  $switch: {
    branches: [
      // {
      //   case: {
      //     $allElementsTrue: {
      //       $map: {
      //         input: "$message_status",
      //         in: {
      //           $cond: {
      //             if: {
      //               $eq: [
      //                 MESSAGE_STATUS.seenOff,
      //                 "$$this.status",
      //               ],
      //             },
      //             then: true,
      //             else: false,
      //           },
      //         },
      //       },
      //     },
      //   },
      //   then: MESSAGE_STATUS.received,
      // },
      {
        case: {
          $allElementsTrue: {
            $map: {
              input: message_status,
              in: {
                $cond: {
                  if: {
                    $eq: [MESSAGE_STATUS.seen, "$$this.status"],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
        },
        then: MESSAGE_STATUS.seen,
      },
      {
        case: {
          $allElementsTrue: {
            $map: {
              input: message_status,
              in: {
                $cond: {
                  if: {
                    $gte: ["$$this.status", MESSAGE_STATUS.received],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
        },
        then: MESSAGE_STATUS.received,
      },
      // {
      //   case: {
      //     $allElementsTrue: {
      //       $map: {
      //         input: "$message_status",
      //         in: {
      //           $cond: {
      //             if: {
      //               $gte: [MESSAGE_STATUS.sent, "$$this.status"],
      //             },
      //             then: true,
      //             else: false,
      //           },
      //         },
      //       },
      //     },
      //   },
      //   then: MESSAGE_STATUS.sent,
      // },
    ],
    default: MESSAGE_STATUS.sent,
  },
});

export const messageStatusValuePipeline = (user) => [
  {
    $lookup: {
      from: "message_statuses",
      localField: "_id",
      foreignField: "message",
      as: "message_status",
    },
  },
  {
    $match: {
      $or: [{ sender: user }, { "message_status.user": user }],
    },
  },
  // {
  //   $addFields: {
  //     message_status: {
  //       $cond: {
  //         if: "$deleted",
  //         then: MESSAGE_STATUS.deletedEveryone,
  //         else: {
  //           $cond: {
  //             if: {
  //               $ne: ["$sender", user],
  //             },
  //             then: null,
  //             else: messageStatusValue("$message_status"),
  //           },
  //         },
  //       },
  //     },
  //   },
  // },
];

// export const removeReplyInForward = [
//   {
//     $project: {
//       reply: 0,
//     },
//   },
//   {
//     $lookup: {
//       from: "messages",
//       localField: "forwarded",
//       foreignField: "_id",
//       as: "forward",
//     },
//   },
//   {
//     $unwind: {
//       path: "$forward",
//       preserveNullAndEmptyArrays: true,
//     },
//   },
// ];

export const pollPipeline = [
  {
    $lookup: {
      from: "polls",
      foreignField: "_id",
      localField: "poll",
      as: "poll",
    },
  },
  {
    $unwind: {
      path: "$poll",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $lookup: {
      from: "poll_votes",
      localField: "poll.options._id",
      foreignField: "option",
      pipeline: [
        {
          $lookup: {
            from: "users",
            localField: "user",
            pipeline: [{ $project: userProject() }],
            foreignField: "_id",
            as: "userDetails",
          },
        },
        {
          $unwind: "$userDetails",
        },
        {
          $addFields: {
            "userDetails.option": "$option",
            "userDetails.updatedAt": "$updatedAt",
          },
        },
        {
          $project: { userDetails: 1 },
        },
      ],
      as: "voters",
    },
  },
  {
    $addFields: {
      poll: {
        $cond: {
          if: "$poll",
          then: {
            _id: "$poll._id",
            question: "$poll.question",
            options: {
              $map: {
                input: "$poll.options",
                as: "option",
                in: {
                  text: "$$option.text",
                  _id: "$$option._id",
                  voters: {
                    $filter: {
                      input: "$voters.userDetails",
                      as: "voter",
                      cond: {
                        $eq: ["$$voter.option", "$$option._id"],
                      },
                    },
                  },
                },
              },
            },
          },
          else: "$poll",
        },
      },
    },
  },
];

export const storyPipeline = [
  {
    $lookup: {
      from: "stories",
      foreignField: "_id",
      localField: "story",
      pipeline: [
        ...mediaFilePipeline,
        {
          $lookup: {
            from: "users",
            foreignField: "_id",
            localField: "user",
            pipeline: [
              {
                $project: userProject(),
              },
            ],
            as: "user",
          },
        },
        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: true,
          },
        },
      ],
      as: "story",
    },
  },
  {
    $unwind: {
      path: "$story",
      preserveNullAndEmptyArrays: true,
    },
  },
];

// export const thumbnailFilePipeline = [
//   {
//     $lookup: {
//       from: "files",
//       localField: "link.thumbnail",
//       foreignField: "_id",
//       pipeline: [
//         {
//           $match: {
//             status: true,
//           },
//         },
//         {
//           $lookup: {
//             from: "storages",
//             localField: "serviceId",
//             foreignField: "_id",
//             pipeline: [
//               {
//                 $match: {
//                   status: true,
//                   enabled: true,
//                 },
//               },
//             ],
//             as: "storages",
//           },
//         },
//         {
//           $unwind: {
//             path: "$storages",
//             preserveNullAndEmptyArrays: false,
//           },
//         },
//       ],
//       as: "thumbnailMedia",
//     },
//   },
//   {
//     $unwind: {
//       path: "$thumbnailMedia",
//       preserveNullAndEmptyArrays: true,
//     },
//   },
//   {
//     $addFields: {
//       "link.thumbnailUrl": {
//         $cond: {
//           if: "$link.thumbnailUrl",
//           then: {
//             $concat: [
//               "$thumbnailMedia.storages.credentials.cdn_url",
//               "$thumbnailMedia.url",
//             ],
//           },
//           else: "$link.thumbnailUrl",
//         },
//       },
//       "link.mediaSize": "$thumbnailMedia.size",
//     },
//   },
// ];

// export const chatAddPipelineMessage = [
//   {
//     $lookup: {
//       from: "users",
//       localField: "chatIs",
//       foreignField: "_id",
//       pipeline: [
//         {
//           $project: userProject(false),
//         },
//       ],
//       as: "chatUser",
//     },
//   },
//   {
//     $lookup: {
//       from: "groups",
//       localField: "chatIs",
//       foreignField: "_id",
//       as: "chatGroup",
//     },
//   },
//   {
//     $addFields: {
//       chatIs: {
//         $cond: {
//           if: { $eq: ["$chatUser", []] },
//           then: "$chatGroup",
//           else: "$chatUser",
//         },
//       },
//     },
//   },
//   {
//     $unwind: {
//       path: "$chatIs",
//     },
//   },
// ];
