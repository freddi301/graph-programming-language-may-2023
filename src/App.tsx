import React from "react";
import styled from "styled-components/macro";
import { defaultTheme as theme } from "./components/theme";
import { useLocalStorage } from "./components/useLocalStorage";
import { flatMap, uniqWith } from "lodash";

export default function App() {
  return <AppInstance />;
}

function appFactory<Graph, NodeId>({
  Graph,
  NodeId,
}: {
  Graph: GraphInterface<Graph, NodeId>;
  NodeId: NodeIdInterface<NodeId>;
}) {
  const NodeAttributes = nodeAttributesInstanceFactory<NodeId>(NodeId);
  type GraphId = string;
  type GraphColor = string;
  return function App() {
    const [graphs, setGraphs] = useLocalStorage<Record<string, Graph>>({
      key: "graphs",
      initialValue: {},
      serialize(graphs) {
        return JSON.stringify(
          Object.fromEntries(Object.entries(graphs).map(([graphId, graph]) => [graphId, Graph.toJsonObject(graph)]))
        );
      },
      deserialize(json) {
        try {
          return Object.fromEntries(
            Object.entries(JSON.parse(json)).map(([graphId, graph]: any) => [graphId, Graph.fromJsonObject(graph)])
          );
        } catch (error) {
          return null;
        }
      },
    });
    const [currentGraphId, setCurrentGraphId] = React.useState<GraphId | null>();
    const [graphsDiffColors, setGraphsDiffColors] = React.useState<Record<GraphId, GraphColor>>({});
    return (
      <div
        css={`
          background-color: ${theme.backgroundColor};
          color: ${theme.textColor};
          font-family: ${theme.fontFamily};
          width: 100vw;
          height: 100vh;
        `}
      >
        <div
          css={`
            background-color: ${theme.backgroundColorSecondary};
            display: flex;
            flex-wrap: wrap;
          `}
        >
          {Object.keys(graphs).map((graphId) => {
            const isSelected = graphId === currentGraphId;
            const diffColor = graphsDiffColors[graphId];
            const isDiff = Boolean(diffColor);
            return (
              <div
                key={graphId}
                css={`
                  background-color: ${isSelected ? theme.backgroundColor : theme.backgroundColorSecondary};
                  &:hover {
                    background-color: ${theme.backgroundColorHighlight};
                  }
                  border-bottom: 4px solid ${isDiff ? diffColor : "transparent"};
                  user-select: none;
                  width: 100px;
                  padding-left: 1ch;
                  display: flex;
                  justify-content: space-between;
                `}
                onClick={(event) => {
                  if (event.ctrlKey) {
                    const newGraphsDiffColors = { ...graphsDiffColors };
                    if (newGraphsDiffColors[graphId]) {
                      delete newGraphsDiffColors[graphId];
                    } else {
                      // get new diff color from diffColors that is not already used in graphsDiffColors
                      const newDiffColor = diffColors.find(
                        (diffColor) => !Object.values(newGraphsDiffColors).includes(diffColor)
                      )!;
                      newGraphsDiffColors[graphId] = newDiffColor;
                    }
                    setGraphsDiffColors(newGraphsDiffColors);
                  } else {
                    setCurrentGraphId(graphId);
                  }
                }}
              ></div>
            );
          })}
          <SimpleButton
            label="+"
            onClick={() => {
              const graphId = crypto.randomUUID();
              const newGraphs = { ...graphs };
              newGraphs[graphId] = Graph.empty;
              setGraphs(newGraphs);
              setCurrentGraphId(graphId);
            }}
            isEnabled={true}
          />
          <SimpleButton
            label="Duplicate"
            onClick={() => {
              const newGraphs = { ...graphs };
              const newGraphId = crypto.randomUUID();
              newGraphs[newGraphId] = graphs[currentGraphId!];
              setGraphs(newGraphs);
              setCurrentGraphId(newGraphId);
            }}
            isEnabled={Boolean(graphs[currentGraphId!])}
          />
          <SimpleButton
            label="Delete"
            onClick={() => {
              const newGraphs = { ...graphs };
              delete newGraphs[currentGraphId!];
              setGraphs(newGraphs);
            }}
            isEnabled={Boolean(graphs[currentGraphId!])}
          />
        </div>
        {(() => {
          if (!graphs[currentGraphId!]) return null;
          const currentGraphColor = graphsDiffColors[currentGraphId!] ?? currentDiffColor;
          const graphdDiffColorsWithActive = {
            ...Object.fromEntries(Object.entries(graphsDiffColors).filter(([graphId]) => graphs[graphId])),
            [currentGraphId!]: currentGraphColor,
          };
          return (
            <Editor
              graphs={Object.fromEntries(
                Object.entries(graphdDiffColorsWithActive).map(([graphId, graphColor]) => [graphColor, graphs[graphId]])
              )}
              onGraphChange={(graphColor, graph) => {
                const graphId = Object.entries(graphdDiffColorsWithActive).find(
                  ([graphId, color]) => color === graphColor
                )![0];
                const newGraphs = { ...graphs };
                newGraphs[graphId] = graph;
                setGraphs(newGraphs);
              }}
              currentGraphColor={currentGraphColor}
            />
          );
        })()}
      </div>
    );
  };
  function Editor({
    graphs,
    onGraphChange,
    currentGraphColor,
  }: {
    currentGraphColor: string;
    graphs: Record<GraphColor, Graph>;
    onGraphChange(graphKey: string, graph: Graph): void;
  }) {
    const [text, setText] = React.useState("");
    const [highlightedNodeId, setHighlightedNodeId] = React.useState<NodeId | null>(null);
    return (
      <div css={``}>
        {groupGraphColorsByUniqueNodeAttributes(graphs).map(({ nodeId, groups }) => {
          return (
            <React.Fragment key={NodeId.stringify(nodeId)}>
              {groups.map(({ nodeAttributes, graphColors }, index) => {
                if (!nodeAttributes) return null;
                const isCurrentGraph = graphColors.includes(currentGraphColor);
                return (
                  <div key={index} css={``}>
                    {groups.length > 1 && <GraphColorMiniGrid graphColors={graphColors} />}
                    <NodeLabel
                      graph={isCurrentGraph ? graphs[currentGraphColor] : graphs[graphColors[0]]}
                      nodeId={nodeId}
                      onGraphChange={(graph) => {
                        if (isCurrentGraph) {
                          onGraphChange(currentGraphColor, graph);
                        }
                      }}
                      isHighlighted={highlightedNodeId ? NodeId.isEqual(highlightedNodeId, nodeId) : false}
                      onIsHighlighted={setHighlightedNodeId}
                    />
                    {" = "}
                    <NodeIdSelector
                      graphs={graphs}
                      currentGraphColor={currentGraphColor}
                      value={nodeAttributes.extract}
                      onChange={(extractNodeId) => {
                        if (isCurrentGraph) {
                          onGraphChange(
                            currentGraphColor,
                            Graph.setNodeAttributes(graphs[currentGraphColor], nodeId, {
                              ...nodeAttributes,
                              extract: extractNodeId,
                            })
                          );
                        }
                      }}
                      isHighlighted={equalsManageNull(NodeId.isEqual)(highlightedNodeId, nodeAttributes.extract)}
                      onIsHighlighted={setHighlightedNodeId}
                    />
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
        {graphs[currentGraphColor] && (
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
                  Graph.setNodeAttributes(graphs[currentGraphColor], nodeId, { label: text, extract: null })
                );
                setText("");
              }
            }}
          />
        )}
      </div>
    );
  }
  function NodeLabel({
    graph,
    onGraphChange,
    nodeId,
    isHighlighted,
    onIsHighlighted,
  }: {
    graph: Graph;
    onGraphChange(graph: Graph): void;
    nodeId: NodeId;
    isHighlighted: boolean;
    onIsHighlighted(nodeId: NodeId | null): void;
  }) {
    const [text, setText] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [hasFocus, setHasFocus] = React.useState(false);
    const nodeAttributes = Graph.getNodeAttributes(graph, nodeId);
    const width = (() => {
      if (hasFocus) {
        if (text === "") {
          if (nodeAttributes?.label) return nodeAttributes.label.length;
          return NodeId.stringify(nodeId).length;
        }
        return text.length;
      } else {
        if (nodeAttributes?.label) return nodeAttributes.label.length;
        return NodeId.stringify(nodeId).length;
      }
    })();
    return (
      <input
        ref={inputRef}
        value={hasFocus ? text : nodeAttributes?.label ?? NodeId.stringify(nodeId)}
        onChange={(event) => {
          setText(event.target.value);
        }}
        placeholder={
          hasFocus && text === "" && nodeAttributes?.label ? nodeAttributes?.label : NodeId.stringify(nodeId)
        }
        css={`
          background-color: ${isHighlighted ? theme.backgroundColorHighlight : theme.backgroundColor};
          outline: none;
          border: none;
          color: ${hasFocus ? theme.textColorSecondary : theme.textColor};
          font-size: inherit;
          font-family: inherit;
          width: ${width || 1}ch;
        `}
        onFocus={() => {
          setHasFocus(true);
          setText(nodeAttributes?.label ? nodeAttributes.label : "");
          onIsHighlighted(nodeId);
        }}
        onBlur={() => {
          setHasFocus(false);
          onGraphChange(Graph.setNodeAttributes(graph, nodeId, { ...nodeAttributes!, label: text }));
          setText("");
          onIsHighlighted(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onGraphChange(Graph.setNodeAttributes(graph, nodeId, { ...nodeAttributes!, label: text }));
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setText(nodeAttributes?.label ? nodeAttributes.label : "");
            setTimeout(() => {
              inputRef.current?.blur();
            });
          }
        }}
        onMouseEnter={(event) => {
          onIsHighlighted(nodeId);
        }}
        onMouseLeave={(event) => {
          onIsHighlighted(null);
        }}
      />
    );
  }
  function NodeIdSelector({
    graphs,
    currentGraphColor,
    value,
    onChange,
    isHighlighted,
    onIsHighlighted,
  }: {
    graphs: Record<GraphColor, Graph>;
    currentGraphColor: GraphColor;
    value: NodeId | null;
    onChange(nodeId: NodeId | null): void;
    isHighlighted: boolean;
    onIsHighlighted(nodeId: NodeId | null): void;
  }) {
    const [text, setText] = React.useState("");
    const suggestions = groupGraphColorsByUniqueNodeAttributes(graphs)
      .flatMap(({ nodeId, groups }) => {
        return flatMap(groups, ({ nodeAttributes, graphColors }) => {
          return nodeAttributes ? [{ nodeId, nodeAttributes, graphColors }] : [];
        });
      })
      .sort((a, b) => {
        const byLevenstein =
          getLevenshteinDistance(text, a.nodeAttributes.label) - getLevenshteinDistance(text, b.nodeAttributes.label);
        if (byLevenstein !== 0) return byLevenstein;
        return a.nodeAttributes.label.localeCompare(b.nodeAttributes.label);
      });
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = React.useState<number | null>(null);
    const [hasFocus, setHasFocus] = React.useState(false);
    const valueNodeAttributes = value ? Graph.getNodeAttributes(graphs[currentGraphColor], value) : null;
    const inputRef = React.useRef<HTMLInputElement>(null);
    const width = (() => {
      if (hasFocus) {
        return text.length;
      } else {
        if (valueNodeAttributes?.label) return valueNodeAttributes.label.length;
        if (value) return NodeId.stringify(value).length;
      }
    })();
    return (
      <div
        css={`
          display: inline-block;
          position: relative;
        `}
      >
        <input
          ref={inputRef}
          value={hasFocus ? text : valueNodeAttributes?.label ?? ""}
          onChange={(event) => {
            setText(event.target.value);
          }}
          placeholder={value ? NodeId.stringify(value) : ""}
          css={`
            background-color: ${isHighlighted ? theme.backgroundColorHighlight : theme.backgroundColor};
            outline: none;
            border: none;
            color: ${hasFocus ? theme.textColorSecondary : theme.textColor};
            font-size: inherit;
            font-family: inherit;
            width: ${width || 1}ch;
          `}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              if (selectedSuggestionIndex === suggestions.length - 1) {
                setSelectedSuggestionIndex(null);
              } else {
                if (selectedSuggestionIndex !== null)
                  setSelectedSuggestionIndex(Math.min(selectedSuggestionIndex + 1, suggestions.length - 1));
                else setSelectedSuggestionIndex(0);
              }
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              if (selectedSuggestionIndex === 0) {
                setSelectedSuggestionIndex(null);
              } else {
                if (selectedSuggestionIndex !== null)
                  setSelectedSuggestionIndex(Math.max(selectedSuggestionIndex - 1, 0));
                else setSelectedSuggestionIndex(suggestions.length - 1);
              }
            }
            if (event.key === "Enter" && selectedSuggestionIndex !== null) {
              event.preventDefault();
              if (text === "" && selectedSuggestionIndex === null) {
                onChange(null);
              } else {
                const selectedNode = suggestions[selectedSuggestionIndex];
                if (selectedNode) {
                  onChange(selectedNode.nodeId);
                  inputRef.current?.blur();
                }
              }
            }
            if (event.key === "Escape") {
              event.preventDefault();
              inputRef.current?.blur();
            }
          }}
          onFocus={() => {
            if (value) onIsHighlighted(value);
            setHasFocus(true);
            setText(valueNodeAttributes?.label || "");
            setSelectedSuggestionIndex(null);
          }}
          onBlur={() => {
            setHasFocus(false);
            setText("");
            setSelectedSuggestionIndex(null);
            onIsHighlighted(null);
          }}
          onMouseEnter={(event) => {
            if (value) onIsHighlighted(value);
          }}
          onMouseLeave={(event) => {
            onIsHighlighted(null);
          }}
        />
        {hasFocus && (
          <div
            css={`
              position: absolute;
              top: 100%;
              left: 0px;
              max-height: 400px;
              width: 400px;
              z-index: 1;
              box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.5);
            `}
          >
            {suggestions.map(({ nodeId, nodeAttributes, graphColors }, index) => {
              const isSelected = selectedSuggestionIndex === index;
              return (
                <div
                  key={index}
                  css={`
                    background-color: ${isSelected ? theme.backgroundColorHighlight : theme.backgroundColorSecondary};
                    padding: 0px 1ch;
                  `}
                >
                  <GraphColorMiniGrid graphColors={graphColors} />
                  {nodeAttributes.label}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
  function GraphColorMiniGrid({ graphColors }: { graphColors: Array<GraphColor> }) {
    return (
      <div
        css={`
          display: inline-flex;
        `}
      >
        {graphColors.map((graphColor) => {
          return (
            <div
              key={graphColor}
              css={`
                background-color: ${graphColor};
                width: 1ch;
                height: 1em;
              `}
            ></div>
          );
        })}
      </div>
    );
  }
  function groupGraphColorsByUniqueNodeAttributes(graphs: Record<GraphColor, Graph>) {
    const graphColors = Object.keys(graphs) as Array<GraphColor>;
    const allNodeIds = uniqWith(
      graphColors.flatMap((graphColor) => Graph.getNodeIds(graphs[graphColor])),
      NodeId.isEqual
    );
    return allNodeIds.map((nodeId) => {
      const allNodeAttributes = graphColors.map((graphColor) => Graph.getNodeAttributes(graphs[graphColor], nodeId));
      const uniqueNodeAttributes = uniqWith(allNodeAttributes, equalsManageNull(NodeAttributes.isEqual));
      return {
        nodeId,
        groups: uniqueNodeAttributes.map((nodeAttributes) => {
          return {
            nodeAttributes,
            graphColors: graphColors.filter((graphColor) => {
              return equalsManageNull(NodeAttributes.isEqual)(
                nodeAttributes,
                Graph.getNodeAttributes(graphs[graphColor], nodeId)
              );
            }),
          };
        }),
      };
    });
  }
}

type NodeIdInterface<NodeId> = {
  createUnique(): NodeId;
  stringify(nodeId: NodeId): string;
  isEqual(nodeId1: NodeId, nodeId2: NodeId): boolean;
};

type GraphInterface<Graph, NodeId> = {
  empty: Graph;
  getNodeIds(graph: Graph): Array<NodeId>;
  getNodeAttributes(graph: Graph, nodeId: NodeId): NodeAttributes<NodeId> | null;
  setNodeAttributes(graph: Graph, nodeId: NodeId, attributes: NodeAttributes<NodeId> | null): Graph;
  toJsonObject(graph: Graph): unknown;
  fromJsonObject(object: unknown): Graph | null;
};

type NodeAttributes<NodeId> = {
  label: string;
  extract: NodeId | null;
};

type NodeAttributesInterface<NodeId> = {
  isEqual(attributes1: NodeAttributes<NodeId>, attributes2: NodeAttributes<NodeId>): boolean;
};

function nodeAttributesInstanceFactory<NodeId>(NodeId: NodeIdInterface<NodeId>): NodeAttributesInterface<NodeId> {
  return {
    isEqual(attributes1, attributes2) {
      return (
        attributes1.label === attributes2.label &&
        equalsManageNull(NodeId.isEqual)(attributes1.extract!, attributes2.extract!)
      );
    },
  };
}

const StringNodeId: NodeIdInterface<string> = {
  createUnique() {
    return crypto.randomUUID();
  },
  stringify(nodeId) {
    return nodeId;
  },
  isEqual(nodeId1, nodeId2) {
    return nodeId1 === nodeId2;
  },
};

const DictGraph: GraphInterface<Record<string, NodeAttributes<string>>, string> = {
  empty: {},
  getNodeIds(store) {
    return Object.keys(store);
  },
  getNodeAttributes(store, nodeId) {
    return store[nodeId] ?? null;
  },
  setNodeAttributes(store, nodeId, attributes) {
    if (attributes === null) {
      const { [nodeId]: _, ...rest } = store;
      return rest;
    }
    return {
      ...store,
      [nodeId]: attributes,
    };
  },
  toJsonObject(store) {
    return store;
  },
  fromJsonObject(object) {
    return object as any;
  },
};

const AppInstance = appFactory({ Graph: DictGraph, NodeId: StringNodeId });

function getLevenshteinDistance(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, () => Array.from({ length: b.length + 1 }, () => 0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : Math.min(dp[i - 1][j - 1] + 1, Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1));
  return dp[a.length][b.length];
}

function SimpleButton({ label, onClick, isEnabled }: { label: string; onClick(): void; isEnabled: boolean }) {
  return (
    <div
      onClick={(event) => {
        if (isEnabled) onClick();
      }}
      css={`
        user-select: none;
        background-color: transparent;
        &:hover {
          background-color: ${theme.backgroundColorHighlight};
        }
        padding: 0px 1ch;
        color: ${isEnabled ? theme.textColor : theme.textColorSecondary};
      `}
    >
      {label}
    </div>
  );
}

const diffColors = ["red", "green", "blue", "yellow", "orange", "purple"];
const currentDiffColor = theme.backgroundColor;

function equalsManageNull<T>(equals: (x: T, y: T) => boolean): (x: T | null, y: T | null) => boolean {
  return (x, y) => {
    if (x !== null && y !== null) return equals(x, y);
    if (x === null && y === null) return true;
    return false;
  };
}
