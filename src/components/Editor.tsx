import React from "react";
import "styled-components/macro";
import { GraphColorInterface, GraphInterface, NodeIdInterface, equalsManageNull, NodeAttributesFactory } from "./core";
import { useTheme } from "./theme";
import { uniqWith } from "lodash";
import { GraphColorMiniGridFactory } from "./GraphColorMiniGrid";
import { NodeLabelFactory } from "./NodeLabel";
import { NodeIdSelectorFactory } from "./NodeIdSelector";

export function EditorFactory<Graph, NodeId, GraphColor>({
  Graph,
  NodeId,
  GraphColor,
}: {
  Graph: GraphInterface<Graph, NodeId>;
  NodeId: NodeIdInterface<NodeId>;
  GraphColor: GraphColorInterface<GraphColor>;
}) {
  const NodeAttributes = NodeAttributesFactory<NodeId>(NodeId);
  const NodeLabel = NodeLabelFactory({ Graph, NodeId });
  const NodeIdSelector = NodeIdSelectorFactory({ Graph, NodeId, GraphColor });
  const GraphColorMiniGrid = GraphColorMiniGridFactory({ Graph, GraphColor, NodeId });
  return function Editor({
    graphColors,
    graphByColor,
    onGraphChange,
    currentGraphColor,
  }: {
    graphColors: Array<GraphColor>;
    graphByColor(graphColor: GraphColor): Graph;
    currentGraphColor: GraphColor;
    onGraphChange(graphColor: GraphColor, graph: Graph): void;
  }) {
    const theme = useTheme();
    const [text, setText] = React.useState("");
    const [highlightedNodeId, setHighlightedNodeId] = React.useState<NodeId | null>(null);
    const allNodeIds = uniqWith(
      graphColors.flatMap((graphColor) => Graph.getNodeIds(graphByColor(graphColor))),
      NodeId.isEqual
    );
    const groupings = allNodeIds.map((nodeId) => {
      const uniqueNodeAttributes = uniqWith(
        graphColors.map((graphColor) => Graph.getNodeAttributes(graphByColor(graphColor), nodeId)),
        equalsManageNull(NodeAttributes.isEqual)
      );
      return {
        nodeId,
        uniqueNodeAttributes: uniqueNodeAttributes.map((nodeAttributes) => {
          return {
            nodeAttributes,
            graphColors: graphColors.filter((graphColor) => {
              return equalsManageNull(NodeAttributes.isEqual)(
                nodeAttributes,
                Graph.getNodeAttributes(graphByColor(graphColor), nodeId)
              );
            }),
          };
        }),
      };
    });
    return (
      <div css={``}>
        {groupings.map(({ nodeId, uniqueNodeAttributes }) => {
          return (
            <div
              key={NodeId.stringify(nodeId)}
              css={`
                border-left: 1ch solid
                  ${highlightedNodeId !== null && NodeId.isEqual(nodeId, highlightedNodeId)
                    ? theme.backgroundColorHighlight
                    : "transparent"};
              `}
            >
              {uniqueNodeAttributes.map((mapping, index) => {
                const isCurrentGraph = mapping.graphColors.includes(currentGraphColor);
                return (
                  <div
                    key={index}
                    css={`
                      background-image: ${isCurrentGraph
                        ? "transparent"
                        : `radial-gradient(${theme.backgroundColorHighlight} 0.5px, transparent 0)`};
                      background-size: 4px 4px;
                      /* background-position: -2px -2px; */
                    `}
                  >
                    <GraphColorMiniGrid
                      graphColors={graphColors}
                      isPresent={(graphColor) => mapping.graphColors.some((gc) => GraphColor.isEqual(gc, graphColor))}
                      onClick={(graphColor) => {
                        onGraphChange(
                          currentGraphColor,
                          Graph.setNodeAttributes(
                            graphByColor(currentGraphColor),
                            nodeId,
                            Graph.getNodeAttributes(graphByColor(graphColor), nodeId)
                          )
                        );
                      }}
                    />
                    {mapping.nodeAttributes && (
                      <React.Fragment>
                        <NodeLabel
                          nodeId={nodeId}
                          nodeAttributes={mapping.nodeAttributes}
                          onNodeAttributesChange={(nodeAttributes) => {
                            if (isCurrentGraph) {
                              onGraphChange(
                                currentGraphColor,
                                Graph.setNodeAttributes(graphByColor(currentGraphColor), nodeId, nodeAttributes)
                              );
                            }
                          }}
                          isHighlighted={highlightedNodeId !== null && NodeId.isEqual(nodeId, highlightedNodeId)}
                          onIsHighlighted={setHighlightedNodeId}
                          isReadonly={!isCurrentGraph}
                        />
                        {" = "}
                        <NodeIdSelector
                          graphColors={graphColors}
                          graphByColor={graphByColor}
                          valueNodeId={mapping.nodeAttributes.extract}
                          valueNodeAttributes={
                            mapping.nodeAttributes.extract
                              ? Graph.getNodeAttributes(graphByColor(currentGraphColor), mapping.nodeAttributes.extract)
                              : null
                          }
                          onChange={(extractNodeId) => {
                            if (isCurrentGraph && mapping.nodeAttributes) {
                              onGraphChange(
                                currentGraphColor,
                                Graph.setNodeAttributes(graphByColor(currentGraphColor), nodeId, {
                                  ...mapping.nodeAttributes,
                                  extract: extractNodeId,
                                })
                              );
                            }
                          }}
                          isHighlighted={
                            highlightedNodeId !== null &&
                            equalsManageNull(NodeId.isEqual)(highlightedNodeId, mapping.nodeAttributes.extract)
                          }
                          onIsHighlighted={setHighlightedNodeId}
                          isReadonly={!isCurrentGraph}
                          filter={() => true}
                        />
                      </React.Fragment>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
        <NodeIdSelector
          graphColors={graphColors}
          graphByColor={graphByColor}
          valueNodeId={null}
          valueNodeAttributes={null}
          onChange={(nodeId, nodeAttributes) => {
            if (nodeId) {
              onGraphChange(
                currentGraphColor,
                Graph.setNodeAttributes(
                  graphByColor(currentGraphColor),
                  nodeId,
                  nodeAttributes ?? { label: "", extract: null }
                )
              );
            }
          }}
          isHighlighted={false}
          onIsHighlighted={setHighlightedNodeId}
          isReadonly={false}
          filter={(nodeId) => Graph.getNodeAttributes(graphByColor(currentGraphColor), nodeId) === null}
        />
        <input
          value={text}
          onChange={(event) => {
            setText(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              const nodeId = NodeId.createUnique();
              onGraphChange(
                currentGraphColor,
                Graph.setNodeAttributes(graphByColor(currentGraphColor), nodeId, { label: text, extract: null })
              );
              setText("");
            }
          }}
        />
      </div>
    );
  };
}
