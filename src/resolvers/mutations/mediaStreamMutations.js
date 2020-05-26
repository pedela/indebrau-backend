const { activeMediaStreamsCache } = require('../../utils/caches');
const { checkUserPermissions } = require('../../utils/checkUserPermissions');
const {
  createMediaFolder,
  deleteMediaFolder
} = require('../../utils/mediaFileHandling');

const mediaStreamMutations = {
  async createMediaStream(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);

    // 1. search for previous active streams with same name and deactivate if exists
    // (arguably, there could be multiple media streams (of multiple brewing processes)
    // recording the same media files. Or, there could be multiple brewing processes per
    // media stream. Same goes for graphs..)
    await ctx.db.mutation.updateManyMediaStreams({
      where: { active: true, mediaFilesName: args.mediaFilesName },
      data: { active: false }
    });
    // 2. create media stream
    const createdMediaStream = await ctx.db.mutation.createMediaStream(
      {
        data: {
          mediaFilesName: args.mediaFilesName,
          updateFrequency: args.updateFrequency,
          overwrite: args.overwrite,
          brewingSteps: { set: args.steps },
          active: true,
          brewingProcess: {
            connect: {
              id: args.brewingProcessId
            }
          }
        }
      },
      `{
        id
      }`
    );
    // 3. update cache (since new stream was added)
    await activeMediaStreamsCache(ctx, true);
    if (!createdMediaStream) {
      throw new Error('Problem creating new media stream');
    } else {
      // create folder for media and return
      await createMediaFolder(args.brewingProcessId, createdMediaStream.id);
      return createdMediaStream.id;
    }
  },

  async deleteMediaStream(parent, args, ctx, info) {
    checkUserPermissions(ctx, ['ADMIN']);
    const where = { id: args.id };
    // first get mediaFile list and brewing process id of stream
    // TODO check if process could be found, throw (meaningful) error otherwise
    const { brewingProcess } = await ctx.db.query.mediaStream(
      { where },
      '{ brewingProcess {id} }'
    );
    // now delete stream
    const deletedMediaStream = await ctx.db.mutation.deleteMediaStream(
      { where },
      info
    );
    // check, if stream was deleted from database
    if (!deletedMediaStream) {
      throw new Error('Problem deleting media stream with id: ' + args.id);
    }
    // update cache since stream was deleted in db
    await activeMediaStreamsCache(ctx, true);
    // finally, remove media from disk
    await deleteMediaFolder(brewingProcess.id, args.id);
    return deletedMediaStream;
  }
};

module.exports = { mediaStreamMutations };
