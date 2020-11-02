const multer = require('multer');
const fs = require('fs-extra');
const crypto = require('crypto');
const { activeMediaStreamsCache } = require('./caches');
const { checkUserPermissions } = require('./checkUserPermissions');

/* Put's media files in database. Matches media name with stream name! */
async function handleMediaUpload(prisma, logger, req) {
  checkUserPermissions({ req: { user: req.user } }, ['ADMIN']);
  const { mediaStreamName, mediaTimeStamp, mediaMimeType } = req.body;
  const mediaFileName = mediaStreamName + new Date(mediaTimeStamp).getTime();
  const activeMediaStreams = await activeMediaStreamsCache({ prisma, logger });
  let insertedMediaFiles = [];

  for (let i = 0; i < activeMediaStreams.length; i++) {
    const activeMediaStream = activeMediaStreams[i];

    if (activeMediaStream.mediaFilesName == mediaStreamName) {
      // see if graph data new than this date can be found
      const mediaFileQuery = await prisma.mediaFile.findMany({
        where: { mediaStream: { id: activeMediaStream.id } },
        orderBy: { time: 'asc' },
        take: 1
      });
      let oldMediaFileId = -1;
      let oldPublicIdentifier = -1;
      // if found one "old" file
      if (!mediaFileQuery.length == 0) {
        let latestMediaFile = mediaFileQuery[0];
        const earliestDate = new Date(mediaTimeStamp).getTime() -
          activeMediaStream.updateFrequency * 1000; // last entry must be at least this old
        // if "old enough"..
        if (new Date(latestMediaFile.time).getTime() < earliestDate) {
          // prepare for overwrite
          if (activeMediaStream.overwrite) {
            oldMediaFileId = latestMediaFile.id;
            oldPublicIdentifier = latestMediaFile.publicIdentifier;
          }
        }
        else {
          continue; // media too recent
        }
      }
      // now copy file to final destination
      let publicIdentifier = await copyAndRenameTempFile(
        activeMediaStream,
        mediaFileName,
        mediaMimeType
      );
      // and insert (no overwrite) or update (overwrite) to database
      insertedMediaFiles.push(
        await prisma.mediaFile.upsert({
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
        })
      );
      // if overwrite is activated and old file was present, remove old file
      if (activeMediaStream.overwrite && oldPublicIdentifier != -1) {
        await deleteMedia(activeMediaStream, oldPublicIdentifier);
      }
    }
  }
  await deleteTempMedia(mediaFileName);
  if (insertedMediaFiles.length == 0) {
    throw new Error('No media files stored');
  }
  return JSON.stringify(insertedMediaFiles);
}

async function deleteMedia(mediaStream, publicIdentifier) {
  fs.unlink(
    `${process.env.MAIN_FILES_DIRECTORY}/${mediaStream.brewingStepId}/${mediaStream.id}/${publicIdentifier}`,
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

async function copyAndRenameTempFile(mediaStream, mediaFileName, mediaMimeType) {
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
  case 'IMAGE_JEPG':
    finalFileEnding = '.jpeg';
    break;
  default:
    throw new Error('unsupported MIME-Type');
  }
  let finalFileName = crypto.randomBytes(16).toString('hex') + finalFileEnding;
  let finalFileNameAndLocation = `${process.env.MAIN_FILES_DIRECTORY}/${mediaStream.brewingStepId}/${mediaStream.id}/${finalFileName}`;
  try {
    await fs.copyFile(tempFileNameAndLocation, finalFileNameAndLocation);
    return finalFileName;
  } catch (err) {
    throw new Error(err);
  }
}

/*
Creates a media folder for a given mediastream id.
If brewing step folder does not exist, also creates this parent folder.
*/
async function createMediaFolder(brewingStepId, mediaStreamId) {
  try {
    await fs.mkdir(
      process.env.MAIN_FILES_DIRECTORY + '/' +
      brewingStepId + '/' +
      mediaStreamId,
      { recursive: true }
    );
    // check for temp folder and create if not existing
    if (!fs.existsSync(process.env.MAIN_FILES_DIRECTORY + '/temp')) {
      await fs.mkdir(process.env.MAIN_FILES_DIRECTORY + '/temp'),
      { recursive: true };
    }
  } catch (err) {
    throw new Error(`Cannot create media folder for media stream ${mediaStreamId}: ${err}`);
  }
}

/*
Recursivly deletes a media folder (and its content) of a brewing process
or media stream. Beware, from official Docs:
In recursive mode, errors are not reported if path does not exist,
and operations are retried on failure.
*/
async function deleteMediaFolder(brewingStepId, mediaStreamId) {
  let folder;
  // case of brewing step deletion
  if (!mediaStreamId) {
    folder = process.env.MAIN_FILES_DIRECTORY + '/' + brewingStepId;
    try {
      await fs.rmdir(folder, { recursive: true });
    } catch (err) {
      throw new Error('Cannot remove media folder for brewing step ' + brewingStepId + ': ' + err);
    }
  } else {
    folder =
      process.env.MAIN_FILES_DIRECTORY + '/' +
      brewingStepId + '/' + mediaStreamId;
    try {
      await fs.rmdir(folder, { recursive: true });
    } catch (err) {
      throw new Error(`Cannot remove media folder for media stream ${mediaStreamId}: ${err}`);
    }
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
      new Date(req.body.mediaTimeStamp).getTime() + '.temp'
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
      // reject storing the file
      cb(null, false);
      throw new Error('Wrong MIMEType type!');
    }
  } catch (err) {
    cb(null, false);
    throw err;
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
