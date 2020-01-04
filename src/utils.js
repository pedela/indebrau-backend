const multer = require('multer');
const fs = require('fs');

/* Authorizes users, permissions may be undefined for any permissions acceptable */
function checkUserPermissions(
  ctx,
  permissionsNeeded,
  brewingProcessId,
  graphId
) {
  if (!ctx.request.user) {
    throw new Error('You must be logged in to do that!');
  }
  if (!permissionsNeeded) return;
  const matchedPermissions = ctx.request.user.permissions.filter(
    permissionTheyHave => permissionsNeeded.includes(permissionTheyHave)
  );

  // not the needed user role
  if (!matchedPermissions.length) {
    throw new Error(
      `You do not have sufficient permissions: ${permissionsNeeded}, You Have: ${
        ctx.request.user.permissions
      }`
    );
  }

  // user tries to access brewing process, check if she participates
  if (brewingProcessId && !ctx.request.user.permissions.includes('ADMIN')) {
    let found = false;
    ctx.request.user.participatingBrewingProcesses.map(brewingProcess => {
      if (brewingProcess.id == brewingProcessId) {
        // user has permission
        found = true;
      }
    });
    // no permission
    if (!found) {
      throw new Error(
        `You do not have the right to access brewing process: ${brewingProcessId}`
      );
    }
  }
  // user tries to access graph, check if she participates
  if (graphId && !ctx.request.user.permissions.includes('ADMIN')) {
    let found = false;
    ctx.request.user.participatingBrewingProcesses.map(brewingProcess => {
      brewingProcess.graphs.map(graph => {
        if (graph.id == graphId) {
          // user has permission
          found = true;
        }
      });
    });
    // no permission
    if (!found) {
      throw new Error(`You do not have the right to access graph: ${graphId}`);
    }
  }
}

/* Helper function that caches active graphs (to speed up inserts). */
var cachedActiveGraphs = null;
async function activeGraphCache(ctx, update) {
  if (cachedActiveGraphs == null || update) {
    console.log('refreshing active graph list...');
    cachedActiveGraphs = await ctx.db.query.graphs(
      { where: { active: true } },
      `{
      id, sensorName, active, updateFrequency
      }`
    );
  }
  return cachedActiveGraphs;
}
/* Helper function that caches active media streams (to speed up inserts). */
var cachedMediaStreams = null;
async function activeMediaStreamsCache(ctx, update) {
  if (cachedMediaStreams == null || update) {
    console.log('refreshing active media stream list...');
    cachedMediaStreams = await ctx.db.query.mediaStreams(
      { where: { active: true } },
      `{
      id, mediaFilesName, active, updateFrequency, brewingSteps, overwrite
      }`
    );
  }
  return cachedMediaStreams;
}

/* reduce datapoints evenly across time (every nth element)
   Return: (datapoints - (graphData % dataPoints)) entries */
async function reduceGraphDataEvenly(graphData, dataPoints) {
  // check if variables present and graphData longer than desired
  if (!graphData || !dataPoints || graphData.length < dataPoints) {
    return graphData;
  }
  var reducedData = [];
  var nthElement = graphData.length / dataPoints;

  for (var j = 0; j < dataPoints; j++) {
    let pickPoint = Math.ceil(j * nthElement);
    // prevent overshoot and put last graphData entry into last reduced data entry
    if (pickPoint > graphData.length - 1 || j == dataPoints - 1) {
      reducedData[j] = {
        time: graphData[graphData.length - 1].time,
        value: graphData[graphData.length - 1].value
      };
      break;
    } else {
      reducedData[j] = {
        time: graphData[pickPoint].time,
        value: graphData[pickPoint].value
      };
    }
  }

  return reducedData;
}

/*
Put's media files in database. Matches media name with stream name!
*/
async function handleMediaUpload(db, mediaStreamName, mediaTimestamp) {
  let activeMediaStreams = await activeMediaStreamsCache({db});
  let activeMediaStream = null;
  let oldEnoughLatestMediaFile = null;
  let mediaFileName = mediaStreamName + new Date(mediaTimestamp).getTime() + '.jpg';
  for (let i = 0; i < activeMediaStreams.length; i++) {
    let mediaStream = activeMediaStreams[i];
    if (mediaStream.active && !mediaStream.mediaFilesName.localeCompare(mediaStreamName)) {
      // first matching active media stream is the only machting one
      activeMediaStream = mediaStream;
      // if found, get latest media file's timestamp to
      // determine, if new one has to be inserted
      const earliestDate =
            new Date(mediaTimestamp).getTime() -
        activeMediaStream.updateFrequency * 1000; // last entry must be at least this old
      // now fetch the latest entry's timestamp
      oldEnoughLatestMediaFile = await db.query.mediaFiles(
        {
          where: {
            AND: [
              { mediaStream: { id: activeMediaStream.id } },
              { time_gt: new Date(earliestDate).toJSON() }
            ]
          },
          first: 1
        },
        '{ id, time }'
      );
      break;
    }
  }
  // check if active media stream was found (=> if not, delete media)
  if (activeMediaStream == null) {
    await deleteMedia(mediaFileName);
    throw new Error('no media stream found');
  }
  // check if old media file was found (=> if so, new data too recent)
  if (
    oldEnoughLatestMediaFile != null &&
    !oldEnoughLatestMediaFile.length == 0
  ) {
    await deleteMedia(mediaFileName);
    throw new Error('not new enough');
  }

  // if all checks passed until here, insert data
  const data = await db.mutation.createMediaFile({
    data: {
      time: mediaTimestamp,
      publicIdentifier:  mediaFileName,
      mediaStream: {
        connect: {
          id: activeMediaStream.id
        }
      }
    }
  });
  if (!data) {
    await deleteMedia(mediaFileName);
    throw new Error('no data');
  }
}

async function deleteMedia(mediaFileName) {
  fs.unlink('../indebrau-media/' + mediaFileName, (err) => {
    if (err) throw err;
  });

  return true;
}

/* Multer stuff (for file upload) */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, '../indebrau-media');
  },
  filename: function (req, file, cb) {
    // TODO: ending as mimeType
    cb(null, req.body.mediaStreamName + new Date(req.body.mediaTimestamp).getTime() + '.jpg');
  }
});

const fileFilter = (req, file, cb) => {
  // check íf user is authenticated before actually uploading anything
  // to prevent malicious stuff. Actual check if image is "needed/wanted"
  // comes afterwards and might result in deletion of image.
  checkUserPermissions({request:{user: req.user}}, ['ADMIN']);
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    // rejects storing a file
    cb(null, false);
  }
};

const uploadFile = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5
  },
  fileFilter: fileFilter
});

module.exports = {
  checkUserPermissions,
  activeGraphCache,
  activeMediaStreamsCache,
  reduceGraphDataEvenly,
  handleMediaUpload,
  deleteMedia,
  uploadFile
};
