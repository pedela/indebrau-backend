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
  } else {
    console.log('using active graph cache...');
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
      id, name, active, updateFrequency
      }`
    );
  } else {
    console.log('using active media stream cache...');
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
Handle incoming media Urls.
Returns false if Url is not persisted and Cloudinary media deletion request was send.
mediaMetaData object: cloudinaryId, createdAt, url
*/
async function handleMediaUpload(db, mediaMetaData) {
  let activeMediaStreams = await activeMediaStreamsCache({ db });
  // get active media stream with matching id
  // format id entry (convention.. original looks like "ID_randomNumber")
  mediaMetaData.cloudinaryId = mediaMetaData.cloudinaryId.substring(
    0,
    mediaMetaData.cloudinaryId.lastIndexOf('/')
  );
  var activeMediaStream = null;
  var oldEnoughLatestMediaFile = null;
  for (var i = 0; i < activeMediaStreams.length; i++) {
    let mediaStream = activeMediaStreams[i];
    if (
      mediaStream.active &&
      !mediaStream.name.localeCompare(mediaMetaData.cloudinaryId)
    ) {
      // first active media stream should be the only active media stream..
      activeMediaStream = mediaStream;
      // if found, get latest media file and compare timestamp to
      // determine if new one has to be inserted
      const earliestDate =
        new Date(mediaMetaData.createdAt).getTime() -
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
  // check if active media stream was found
  if (activeMediaStream == null) {
    console.log('no active stream for' + mediaMetaData.cloudinaryId);

    // TODO delete file from Cloudinary!
    return false;
  }
  // check if old media file was found (=> new data too recent)
  if (
    oldEnoughLatestMediaFile != null &&
    !oldEnoughLatestMediaFile.length == 0
  ) {
    // TODO delete file from Cloudinary!
    console.log('too recent data available');
    return false;
  }

  // if all checks passed until here, insert data
  const data = await db.mutation.createMediaFile({
    data: {
      time: mediaMetaData.createdAt,
      url: mediaMetaData.url,
      mediaStream: {
        connect: {
          id: activeMediaStream.id
        }
      }
    }
  });
  if (!data) {
    // TODO delete file from Cloudinary!
    console.log('storing went wrong');
    return false;
  }
  return true;
}

module.exports = {
  checkUserPermissions,
  activeGraphCache,
  activeMediaStreamsCache,
  reduceGraphDataEvenly,
  handleMediaUpload
};
