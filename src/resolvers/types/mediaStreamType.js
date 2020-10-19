const mediaStreamType = {
  async mediaFiles(parent, args, ctx) {
    let mediaFiles = await ctx.prisma.mediaFile.findMany({
      where: { mediaStreamId: parent.id }
    });
    return mediaFiles;
  },
  async brewingProcess(parent, args, ctx) {
    let brewingProcess = await ctx.prisma.brewingProcess.findOne({
      where: { id: parent.brewingProcessId }
    });
    return brewingProcess;
  }
};

module.exports = { mediaStreamType };
