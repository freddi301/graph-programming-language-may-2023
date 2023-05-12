export type NodeIdInterface<NodeId> = {
  createUnique(): NodeId;
  stringify(nodeId: NodeId): string;
  isEqual(nodeId1: NodeId, nodeId2: NodeId): boolean;
};

export type GraphInterface<Graph, NodeId> = {
  empty: Graph;
  getNodeIds(graph: Graph): Array<NodeId>;
  getNodeAttributes(graph: Graph, nodeId: NodeId): NodeAttributes<NodeId> | null;
  setNodeAttributes(graph: Graph, nodeId: NodeId, attributes: NodeAttributes<NodeId> | null): Graph;
  toJsonObject(graph: Graph): unknown;
  fromJsonObject(object: unknown): Graph | null;
};

export type NodeAttributes<NodeId> = {
  label: string;
  extract: NodeId | null;
};

type NodeAttributesInterface<NodeId> = {
  isEqual(nodeAttributesA: NodeAttributes<NodeId>, nodeAttributesB: NodeAttributes<NodeId>): boolean;
};

export function NodeAttributesFactory<NodeId>(NodeId: NodeIdInterface<NodeId>): NodeAttributesInterface<NodeId> {
  return {
    isEqual(nodeAttributesA, nodeAttributesB) {
      return (
        nodeAttributesA.label === nodeAttributesB.label &&
        equalsManageNull(NodeId.isEqual)(nodeAttributesA.extract!, nodeAttributesB.extract!)
      );
    },
  };
}

export function equalsManageNull<T>(equals: (x: T, y: T) => boolean): (x: T | null, y: T | null) => boolean {
  return (x, y) => {
    if (x !== null && y !== null) return equals(x, y);
    if (x === null && y === null) return true;
    return false;
  };
}

export type GraphColorInterface<GraphColor> = {
  isEqual(graphColorA: GraphColor, graphColorB: GraphColor): boolean;
  toCssColor(graphColor: GraphColor): string;
  samples: Array<GraphColor>;
  default: GraphColor;
};
