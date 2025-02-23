export const mediaForWallpaper = [
  {
    $lookup: {
      from: "files",
      localField: "imageId",
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
      as: "imageDetails",
    },
  },
  {
    $unwind: {
      path: "$imageDetails",
      preserveNullAndEmptyArrays: false,
    },
  },
  {
    $addFields: {
      url: {
        $concat: [
          "$imageDetails.storages.credentials.cdn_url",
          "$imageDetails.url",
        ],
      },
    },
  },
  {
    $project: {
      imageDetails: 0,
    },
  },
];
