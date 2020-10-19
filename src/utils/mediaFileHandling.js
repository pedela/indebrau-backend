const multer = require('multer');
const fs = require('fs-extra');
const crypto = require('crypto');
const { activeMediaStreamsCache } = require('./caches');
const { checkUserPermissions } = require('./checkUserPermissions');

/* Put's media files in database. Matches media name with stream name! */
async function handleMediaUpload(prisma, req) {
  checkUserPermissions({ req: { user: req.user } }, ['ADMIN']);
  let { mediaStreamName, mediaTimeStamp, mediaMimeType } = req.body;
  let mediaFileName = mediaStreamName + new Date(mediaTimeStamp).getTime();

  let activeMediaStreams = await activeMediaStreamsCache({ prisma });
  let activeMediaStream = null;
  let oldEnoughLatestMediaFile = null;

  for (let i = 0; i < activeMediaStreams.length; i++) {
    let mediaStream = activeMediaStreams[i];
    if (
      mediaStream.active &&
      !mediaStream.mediaFilesName.localeCompare(mediaStreamName)
    ) {
      // first matching active media stream is the only machting one
      activeMediaStream = mediaStream;
      // now fetch the latest entry's timestamp
      // TODO: Fetch in cache (and update cache after insert, more fail-proof against wrong inserts, also for graphs)
      oldEnoughLatestMediaFile = await prisma.mediaFile.findMany({
        where: { mediaStream: { id: activeMediaStream.id } },
        orderBy: { time: 'asc' },
        take: 1
      });
      break;
    }
  }
  // check if active media stream was found (=> if not, delete media)
  if (activeMediaStream == null) {
    await deleteTempMedia(mediaFileName);
    throw new Error('No media stream found');
  }
  // check if old media file was found (=> if so, check if new data too recent and delete media)
  const earliestDate =
    new Date(mediaTimeStamp).getTime() -
    activeMediaStream.updateFrequency * 1000; // last entry must be at least this old
  if (
    oldEnoughLatestMediaFile[0] != null &&
    new Date(oldEnoughLatestMediaFile[0].time).getTime() > earliestDate
  ) {
    await deleteTempMedia(mediaFileName);
    throw new Error('Media not new enough');
  }
  let oldMediaFileId = -1;
  let oldPublicIdentifier = -1;
  if (oldEnoughLatestMediaFile[0] != null && activeMediaStream.overwrite) {
    oldMediaFileId = oldEnoughLatestMediaFile[0].id;
    oldPublicIdentifier = oldEnoughLatestMediaFile[0].publicIdentifier;
  }
  // if all checks passed until here, copy file to final destination and insert / update to database
  let publicIdentifier = await moveAndRenameTempFile(
    activeMediaStream,
    mediaFileName,
    mediaMimeType
  );
  const data = await prisma.mediaFile.upsert({
    where: { id: oldMediaFileId },
    create: {
      time: mediaTimeStamp,
      publicIdentifier: publicIdentifier,
      mimeType: mediaMimeType,
      mediaStream: { connect: { id: activeMediaStream.id } }
    },
    update: {
      time: mediaTimeStamp,
      publicIdentifier: publicIdentifier,
      mimeType: mediaMimeType,
      mediaStream: { connect: { id: activeMediaStream.id } }
    }
  });
  if (!data) {
    throw new Error('could not insert to database');
  }
  // if overwrite is activated and old file present, remove old file
  if (activeMediaStream.overwrite && oldPublicIdentifier != -1) {
    await deleteMedia(activeMediaStream, oldPublicIdentifier);
  }
  return publicIdentifier;
}

async function deleteMedia(mediaStream, publicIdentifier) {
  fs.unlink(
    `${process.env.MAIN_FILES_DIRECTORY}/${mediaStream.brewingProcessId}/${mediaStream.id}/${publicIdentifier}`,
    (err) => {
      if (err) throw new Error(err);
    }
  );
}

async function deleteTempMedia(mediaFileName) {
  fs.unlink(
    process.env.MAIN_FILES_DIRECTORY + '/temp/' + mediaFileName + '.temp',
    (err) => {
      if (err) throw new Error(err);
    }
  );
}

async function moveAndRenameTempFile(
  mediaStream,
  mediaFileName,
  mediaMimeType
) {
  let tempFileNameAndLocation =
    process.env.MAIN_FILES_DIRECTORY + '/temp/' + mediaFileName + '.temp';
  // TODO sync with supported MIME-Types..
  let finalFileEnding;
  switch (mediaMimeType) {
    case 'IMAGE_PNG':
      finalFileEnding = '.png';
      break;
    case 'IMAGE_JPG':
      finalFileEnding = '.jpg';
      break;
    case 'IMAGE_JPEG':
      finalFileEnding = '.jpeg';
      break;
    default:
      await deleteTempMedia(mediaFileName);
      throw new Error('unsupported MIME-Type');
  }
  let finalFileName = crypto.randomBytes(16).toString('hex') + finalFileEnding;
  let finalFileNameAndLocation = `${process.env.MAIN_FILES_DIRECTORY}/${mediaStream.brewingProcessId}/${mediaStream.id}/${finalFileName}`;
  try {
    await fs.copyFile(tempFileNameAndLocation, finalFileNameAndLocation);
    await deleteTempMedia(mediaFileName);
    return finalFileName;
  } catch (err) {
    await deleteTempMedia(mediaFileName);
    throw new Error(err);
  }
}

async function createMediaFolder(brewingProcessId, mediaStreamId) {
  try {
    await fs.mkdir(
      process.env.MAIN_FILES_DIRECTORY +
      '/' +
      brewingProcessId +
      '/' +
      mediaStreamId,
      { recursive: true }
    );
    // check for temp folder and create if not existing
    if (!fs.existsSync(process.env.MAIN_FILES_DIRECTORY + '/temp')) {
      await fs.mkdir(process.env.MAIN_FILES_DIRECTORY + '/temp'),
        { recursive: true };
    }
  } catch (err) {
    throw new Error(err);
  }
}

// Deletes a media folder of a brewing process or media stream
// beware, from official Docs: In recursive mode, errors are not reported if path does not exist,
// and operations are retried on failure
async function deleteMediaFolder(brewingProcessId, mediaStreamId) {
  let folder;
  // case, if brewing process was deleted
  if (!mediaStreamId) {
    folder = process.env.MAIN_FILES_DIRECTORY + '/' + brewingProcessId;
  } else {
    folder =
      process.env.MAIN_FILES_DIRECTORY +
      '/' +
      brewingProcessId +
      '/' +
      mediaStreamId;
  }
  try {
    await fs.rmdir(folder, { recursive: true });
  } catch (err) {
    throw new Error(err);
  }
}

/* Multer "Stuff" */
// Stores a file in a temp directory. Actual "persistence" of file is done after entry was inserted to database.
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, process.env.MAIN_FILES_DIRECTORY + '/temp');
  },
  filename: function (req, file, cb) {
    cb(
      null,
      req.body.mediaStreamName +
      new Date(req.body.mediaTimeStamp).getTime() +
      '.temp'
    );
  }
});

const fileFilter = (req, file, cb) => {
  // check íf user is authenticated before actually uploading anything
  // to prevent malicious stuff. Actual check if image is "needed/wanted"
  // comes afterwards and might result in deletion of image.
  try {
    checkUserPermissions({ req: { user: req.user } }, ['ADMIN']);
    // TODO Mimetype sync with database (which mime types are accepted)
    if (
      file.mimetype === 'image/jpeg' ||
      file.mimetype === 'image/jpg' ||
      file.mimetype === 'image/png'
    ) {
      cb(null, true);
    } else {
      // rejects storing a file
      cb(null, false);
    }
  } catch (err) {
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
