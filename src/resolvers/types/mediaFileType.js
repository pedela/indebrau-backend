const mediaFileType = {
  async mediaStream(parent, args, ctx) {
    let parentMediaStream = await ctx.prisma.mediaStream.findOne({
      where: { id: parent.mediaStreamId }
    });
    return parentMediaStream;
  }
};

module.exports = { mediaFileType };
