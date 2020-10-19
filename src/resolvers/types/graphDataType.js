const graphDataType = {
  async graph(parent, args, ctx) {
    let parentGraph = await ctx.prisma.graph.findOne({
      where: { id: parent.graphId }
    });
    return parentGraph;
  }
};

module.exports = { graphDataType };
