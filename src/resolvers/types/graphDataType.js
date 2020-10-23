const graphDataType = {
  async graph(parent, args, ctx) {
    return await ctx.prisma.graph.findOne({ where: { id: parent.graphId } });
  }
};

module.exports = { graphDataType };
