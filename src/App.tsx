import React from "react";
import { defaultTheme as theme } from "./components/theme";
import styled from "styled-components/macro";
import { useLocalStorage } from "./components/useLocalStorage";

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
    const [currentGraphId, setCurrentGraphId] = React.useState<string>("");
    const [graphsDiffColors, setGraphsDiffColors] = React.useState<Record<string, string>>({});
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
              newGraphs[newGraphId] = graphs[currentGraphId];
              setGraphs(newGraphs);
              setCurrentGraphId(newGraphId);
            }}
            isEnabled={Boolean(graphs[currentGraphId!])}
          />
          <SimpleButton
            label="Delete"
            onClick={() => {
              const newGraphs = { ...graphs };
              delete newGraphs[currentGraphId];
              setGraphs(newGraphs);
            }}
            isEnabled={Boolean(graphs[currentGraphId!])}
          />
        </div>
        {graphs[currentGraphId!] && (
          <Editor
            graphs={Object.fromEntries(
              Object.entries(graphs).filter(([graphId]) => graphId === currentGraphId || graphsDiffColors[graphId])
            )}
            onGraphChange={(graphKey, graph) => {
              const newGraphs = { ...graphs };
              newGraphs[graphKey!] = graph;
              setGraphs(newGraphs);
            }}
            currentGraphKey={currentGraphId!}
            graphsDiffColors={graphsDiffColors}
          />
        )}
      </div>
    );
  };
  function Editor({
    graphs,
    onGraphChange,
    currentGraphKey,
    graphsDiffColors,
  }: {
    currentGraphKey: string;
    graphs: Record<string, Graph>;
    graphsDiffColors: Record<string, string>;
    onGraphChange(graphKey: string, graph: Graph): void;
  }) {
    const [text, setText] = React.useState("");
    const [highlightedNodeId, setHighlightedNodeId] = React.useState<NodeId | null>(null);
    const allGraphsNodeIds = Array.from(new Set(Object.values(graphs).flatMap((graph) => Graph.getNodeIds(graph))));
    const graphKeys = Object.keys(graphs);
    return (
      <div css={``}>
        {allGraphsNodeIds.map((nodeId) => {
          return (
            <React.Fragment key={NodeId.stringify(nodeId)}>
              {graphKeys.map((graphKey) => {
                const graph = graphs[graphKey];
                const nodeAttributes = Graph.getNodeAttributes(graph, nodeId);
                if (!nodeAttributes) return null;
                return (
                  <div
                    key={graphKey}
                    css={`
                      border-left: 4px solid ${graphsDiffColors[graphKey] || "transparent"};
                    `}
                  >
                    <NodeLabel
                      graph={graph}
                      nodeId={nodeId}
                      onGraphChange={() => {
                        onGraphChange(graphKey, graph);
                      }}
                      isHighlighted={highlightedNodeId ? highlightedNodeId === nodeId : false}
                      onIsHighlighted={setHighlightedNodeId}
                    />
                    {" = "}
                    <NodeIdSelector
                      graph={graph}
                      value={nodeAttributes.extract}
                      onChange={(extractNodeId) => {
                        onGraphChange(
                          graphKey,
                          Graph.setNodeAttributes(graph, nodeId, { ...nodeAttributes, extract: extractNodeId })
                        );
                      }}
                      isHighlighted={highlightedNodeId ? highlightedNodeId === nodeAttributes.extract : false}
                      onIsHighlighted={setHighlightedNodeId}
                    />
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
        <input
          value={text}
          onChange={(event) => {
            setText(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              const nodeId = NodeId.createUnique();
              onGraphChange(
                currentGraphKey,
                Graph.setNodeAttributes(graphs[currentGraphKey], nodeId, { label: text, extract: null })
              );
              setText("");
            }
          }}
        />
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
    const nodeAttributes = Graph.getNodeAttributes(graph, nodeId)!;
    const width = (() => {
      if (hasFocus) {
        if (text === "") {
          if (nodeAttributes.label) return nodeAttributes.label.length;
          return NodeId.stringify(nodeId).length;
        }
        return text.length;
      } else {
        if (nodeAttributes.label) return nodeAttributes.label.length;
        return NodeId.stringify(nodeId).length;
      }
    })();
    return (
      <input
        ref={inputRef}
        value={hasFocus ? text : nodeAttributes.label}
        onChange={(event) => {
          setText(event.target.value);
        }}
        placeholder={hasFocus && text === "" && nodeAttributes.label ? nodeAttributes.label : NodeId.stringify(nodeId)}
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
          setText(nodeAttributes.label ? nodeAttributes.label : "");
          onIsHighlighted(nodeId);
        }}
        onBlur={() => {
          setHasFocus(false);
          onGraphChange(Graph.setNodeAttributes(graph, nodeId, { ...nodeAttributes, label: text }));
          setText("");
          onIsHighlighted(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onGraphChange(Graph.setNodeAttributes(graph, nodeId, { ...nodeAttributes, label: text }));
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setText(nodeAttributes.label ? nodeAttributes.label : "");
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
    graph,
    value,
    onChange,
    isHighlighted,
    onIsHighlighted,
  }: {
    graph: Graph;
    value: NodeId | null;
    onChange(nodeId: NodeId | null): void;
    isHighlighted: boolean;
    onIsHighlighted(nodeId: NodeId | null): void;
  }) {
    const [text, setText] = React.useState("");
    const suggestedNodeIds = Graph.getNodeIds(graph).sort((nodeId1, nodeId2) => {
      const { label: label1 } = Graph.getNodeAttributes(graph, nodeId1)!;
      const { label: label2 } = Graph.getNodeAttributes(graph, nodeId2)!;
      const byLevenstein = getLevenshteinDistance(text, label1) - getLevenshteinDistance(text, label2);
      if (byLevenstein !== 0) return byLevenstein;
      return label1.localeCompare(label2);
    });
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = React.useState<number | null>(null);
    const [hasFocus, setHasFocus] = React.useState(false);
    const valueNodeAttributes = value ? Graph.getNodeAttributes(graph, value) : null;
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
              if (selectedSuggestionIndex === suggestedNodeIds.length - 1) {
                setSelectedSuggestionIndex(null);
              } else {
                if (selectedSuggestionIndex !== null)
                  setSelectedSuggestionIndex(Math.min(selectedSuggestionIndex + 1, suggestedNodeIds.length - 1));
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
                else setSelectedSuggestionIndex(suggestedNodeIds.length - 1);
              }
            }
            if (event.key === "Enter" && selectedSuggestionIndex !== null) {
              event.preventDefault();
              if (text === "" && selectedSuggestionIndex === null) {
                onChange(null);
              } else {
                const nodeId = suggestedNodeIds[selectedSuggestionIndex];
                if (nodeId) {
                  onChange(nodeId);
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
            {suggestedNodeIds.map((nodeId) => {
              const { label } = Graph.getNodeAttributes(graph, nodeId)!;
              const isSelected = nodeId === suggestedNodeIds[selectedSuggestionIndex!];
              return (
                <div
                  key={NodeId.stringify(nodeId)}
                  css={`
                    background-color: ${isSelected ? theme.backgroundColorHighlight : theme.backgroundColorSecondary};
                    padding: 0px 1ch;
                  `}
                >
                  {label}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
}

type NodeIdInterface<NodeId> = {
  createUnique(): NodeId;
  stringify(nodeId: NodeId): string;
  equals(nodeId1: NodeId, nodeId2: NodeId): boolean;
};

type GraphInterface<Graph, NodeId> = {
  empty: Graph;
  getNodeIds(graph: Graph): Array<NodeId>;
  getNodeAttributes(graph: Graph, nodeId: NodeId): NodeAttributes<NodeId> | null;
  setNodeAttributes(graph: Graph, nodeId: NodeId, attributes: NodeAttributes<NodeId> | null): Graph;
  toJsonObject(graph: Graph): unknown;
  fromJsonObject(object: unknown): Graph | null;
  getReferenceCounts(graph: Graph, nodeId: NodeId): number;
};

type NodeAttributes<NodeId> = {
  label: string;
  extract: NodeId | null;
};

const StringNodeId: NodeIdInterface<string> = {
  createUnique() {
    return crypto.randomUUID();
  },
  stringify(nodeId) {
    return nodeId;
  },
  equals(nodeId1, nodeId2) {
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
  getReferenceCounts(graph, nodeId) {
    const Graph = DictGraph;
    const NodeId = StringNodeId;
    let count = 0;
    for (const otherNodeId of Graph.getNodeIds(graph)) {
      const otherNodeAttributes = Graph.getNodeAttributes(graph, otherNodeId)!;
      if (otherNodeAttributes.extract && NodeId.equals(otherNodeAttributes.extract, nodeId)) {
        count++;
      }
    }
    return count;
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
