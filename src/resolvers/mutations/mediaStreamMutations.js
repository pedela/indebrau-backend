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
    await ctx.prisma.mediaStream.updateMany({
      where: { active: true, media_files_name: args.media_files_name },
      data: { active: false }
    });
    // 2. create media stream
    const createdMediaStream = await ctx.prisma.mediaStream.create(
      {
        data: {
          media_files_name: args.media_files_name,
          update_frequency: args.update_frequency,
          overwrite: args.overwrite,
          active: true,
          BrewingProcess: {
            connect: {
              id: parseInt(args.brewing_process_id)
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
      await createMediaFolder(args.brewing_process_id, createdMediaStream.id);
      return createdMediaStream.id;
    }
  },

  async deleteMediaStream(parent, { id }, ctx, info) {
    checkUserPermissions(ctx, ['ADMIN']);
    const where = { id: parseInt(id) };
    // first, get brewing process id of stream
    // TODO check if process could be found, throw (meaningful) error otherwise
    const { brewing_process_id } = await ctx.prisma.mediaStream.findOne({
      where
    });
    // now delete stream
    const deletedMediaStream = await ctx.prisma.mediaStream.delete(
      { where },
      info
    );
    // check, if stream was deleted from database
    if (!deletedMediaStream) {
      throw new Error('Problem deleting media stream with id: ' + id);
    }
    // update cache since stream was deleted in db
    await activeMediaStreamsCache(ctx, true);
    // finally, remove media from disk
    await deleteMediaFolder(brewing_process_id, id);
    return deletedMediaStream;
  }
};

module.exports = { mediaStreamMutations };
