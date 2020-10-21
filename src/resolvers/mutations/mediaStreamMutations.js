const { activeMediaStreamsCache } = require('../../utils/caches');
const { checkUserPermissions } = require('../../utils/checkUserPermissions');
const { createMediaFolder, deleteMediaFolder } = require('../../utils/mediaFileHandling');

const mediaStreamMutations = {
  async createMediaStream(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    // 1. create media stream
    let createdMediaStream;
    try {
      createdMediaStream = await ctx.prisma.mediaStream.create(
        {
          data: {
            mediaFilesName: args.mediaFilesName,
            updateFrequency: args.updateFrequency,
            overwrite: args.overwrite,
            active: true,
            brewingProcess: {
              connect: {
                id: parseInt(args.brewingProcessId)
              }
            }
          }
        }
      );
      // 2. search for previous active streams with same name and deactivate if exists
      await ctx.prisma.mediaStream.updateMany({
        where: {
          active: true, mediaFilesName: args.mediaFilesName,
          NOT: { id: createdMediaStream.id }
        },
        data: { active: false }
      });
    } catch (e) {
      console.log(e);
      throw new Error('Problems querying database');
    }
    // 3. update cache (since new stream was added)
    try {
      await activeMediaStreamsCache(ctx, true);
    } catch (e) {
      console.log(e);
      throw new Error('Caching error');
    }
    // 4. create folder for media and return
    try {
      await createMediaFolder(args.brewingProcessId, createdMediaStream.id);
    } catch (e) {
      console.log(e);
      throw new Error('Problems creating media folder for media stream ' + createdMediaStream.id);
    }
    return createdMediaStream;
  },

  async deleteMediaStream(parent, { id }, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    const where = { id: parseInt(id) };
    let brewingProcessId;
    // first, get brewing process id of stream
    try {
      brewingProcessId = await ctx.prisma.mediaStream.findOne({
        where
      }).brewingProcessId;
    } catch (e) {
      console.log(e);
      throw new Error('Problems querying database');
    }
    if (!brewingProcessId) {
      throw new Error('Media stream with id ' + id + ' does not exist!');
    }
    // now delete stream
    const deletedMediaStream = await ctx.prisma.mediaStream.delete({ where });
    // check, if stream was deleted from database
    if (!deletedMediaStream) {
      throw new Error('Problem deleting media stream with id: ' + id);
    }
    // update cache since stream was deleted in db
    await activeMediaStreamsCache(ctx, true);
    // finally, remove media from disk
    await deleteMediaFolder(brewingProcessId, id);
    return { message: 'Deleted!' };
  }
};

module.exports = { mediaStreamMutations };
