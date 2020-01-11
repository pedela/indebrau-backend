const multer = require('multer');
const fs = require('fs-extra');
const crypto = require('crypto');
const { activeMediaStreamsCache } = require('./caches');
const { checkUserPermissions } = require('./checkUserPermissions');

/*
Put's media files in database. Matches media name with stream name!
*/
async function handleMediaUpload(db, mediaStreamName, mediaTimestamp, mediaMimeType) {
  let activeMediaStreams = await activeMediaStreamsCache({db});
  let activeMediaStream = null;
  let oldEnoughLatestMediaFile = null;
  let mediaFileName = mediaStreamName + new Date(mediaTimestamp).getTime();
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
      // TODO: Fetch in cache (and update cache after insert, more fail-proof against wrong inserts, also for graphs)
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
    await deleteTempMedia(mediaFileName);
    throw new Error('no media stream found');
  }
  // check if old media file was found (=> if so, new data too recent)
  if (
    oldEnoughLatestMediaFile != null &&
    !oldEnoughLatestMediaFile.length == 0
  ) {
    await deleteTempMedia(mediaFileName);
    throw new Error('not new enough');
  }

  // if all checks passed until here,
  // first copy file to final destination and insert to database
  let publicIdentifier =
    await moveAndRenameTempFile(activeMediaStream.brewingProcess.id, activeMediaStream.id, mediaFileName, mediaMimeType);
  console.log('new public id:' + publicIdentifier);
  const data = await db.mutation.createMediaFile({
    data: {
      time: mediaTimestamp,
      publicIdentifier:  publicIdentifier,
      mimeType: mediaMimeType,
      mediaStream: {
        connect: {
          id: activeMediaStream.id
        }
      }
    }
  });
  if (!data) {
    await deleteTempMedia(mediaFileName);
    throw new Error('no data');
  }
}

async function deleteTempMedia(mediaFileName) {
  fs.unlink(process.env.MAIN_FILES_DIRECTORY + '/temp/' + mediaFileName + '.temp', (err) => {
    if (err) throw new Error(err);
    console.log('deleted!');
  });
  return true;
}

async function moveAndRenameTempFile(brewingProcessId, mediaStreamId, mediaFileName, mediaMimeType) {
  let tempFileNameAndLocation =
    process.env.MAIN_FILES_DIRECTORY + '/temp/' + mediaFileName + '.temp';
    // TODO sync with supported MIMETypes..
  let finalFileEnding;
  switch (mediaMimeType) {
  case 'IMAGE_PNG':
    finalFileEnding = '.png';
    break;
  case 'IMAGE_JPG':
    finalFileEnding = '.jpg';
    break;
  case 'IMAGE_JPEG':
    finalFileEnding =  '.JPEG';
    break;
  }
  let finalFileName = crypto.randomBytes(16).toString('hex') + finalFileEnding;
  let finalFileNameAndLocation = `${process.env.MAIN_FILES_DIRECTORY}/${brewingProcessId}/${mediaStreamId}/${finalFileName}`;
  try {
    await fs.copyFile(tempFileNameAndLocation, finalFileNameAndLocation);
    await deleteTempMedia(mediaFileName);
    return finalFileName;
  } catch (err) {
    console.error(err);
  }
}


async function createMediaFolder(brewingProcessId, mediaStreamId) {
  try {
    await fs.mkdir(process.env.MAIN_FILES_DIRECTORY + '/' + brewingProcessId + '/' + mediaStreamId, { recursive: true });
  } catch (err) {
    console.error(err);
    return err;
  }
  return null;
}

async function deleteMediaFolder(brewingProcessId, mediaStreamId) {
  let folder;
  // case, if brewing process was deleted
  if(!mediaStreamId){
    folder = process.env.MAIN_FILES_DIRECTORY + '/' + brewingProcessId;
  }
  else{
    folder = process.env.MAIN_FILES_DIRECTORY + '/' + brewingProcessId + '/' + mediaStreamId;
  }
  try {
    await fs.rmdir(folder, { recursive: true });
  } catch (err) {
    return(err);
  }
  return null;
}


/* Mulcher "Stuff" */
// Stores a file in a temp directory. Actual "persistance" of file is done after entry was inserted to database.
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, process.env.MAIN_FILES_DIRECTORY + '/temp');
  },
  filename: function (req, file, cb) {
    cb(null, req.body.mediaStreamName + new Date(req.body.mediaTimestamp).getTime() + '.temp');
  }
});

const fileFilter = (req, file, cb) => {
  // check íf user is authenticated before actually uploading anything
  // to prevent malicious stuff. Actual check if image is "needed/wanted"
  // comes afterwards and might result in deletion of image.
  checkUserPermissions({request:{user: req.user}}, ['ADMIN']);
  // TODO Mimetype sync with database (which mime types are accepted)
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' ||  file.mimetype === 'image/png') {
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
  handleMediaUpload,
  uploadFile,
  createMediaFolder,
  deleteMediaFolder
};
