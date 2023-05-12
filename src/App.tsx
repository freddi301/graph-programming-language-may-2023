import React from "react";
import "styled-components/macro";
import { useLocalStorage } from "./components/useLocalStorage";
import { GraphColorInterface, GraphInterface, NodeAttributes, NodeIdInterface } from "./components/core";
import { useTheme } from "./components/theme";
import { EditorFactory } from "./components/Editor";

export default function App() {
  return <AppInstance />;
}

function appFactory<Graph, NodeId, GraphColor>({
  Graph,
  NodeId,
  GraphColor,
}: {
  Graph: GraphInterface<Graph, NodeId>;
  NodeId: NodeIdInterface<NodeId>;
  GraphColor: GraphColorInterface<GraphColor>;
}) {
  type GraphId = string;
  const Editor = EditorFactory({ Graph, NodeId, GraphColor });
  return function App() {
    const theme = useTheme();
    const [graphs, setGraphs] = useLocalStorage<Record<GraphId, Graph>>({
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
                      const newDiffColor = GraphColor.samples.find(
                        (graphColor) => !Object.values(newGraphsDiffColors).includes(graphColor)
                      );
                      if (newDiffColor) {
                        newGraphsDiffColors[graphId] = newDiffColor;
                      }
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
          const graphColorIdMap = Object.entries(graphsDiffColors)
            .filter(([graphId]) => graphs[graphId])
            .concat(!(currentGraphId! in graphsDiffColors) ? [[currentGraphId!, GraphColor.default]] : [])
            .map(([graphId, graphColor]) => ({ graphId, graphColor }));
          const currentGraphColor = graphsDiffColors[currentGraphId!] ?? GraphColor.default;
          const graphIdByColor = (graphColor: GraphColor) =>
            graphColorIdMap.find((mapping) => mapping.graphColor === graphColor)!.graphId;
          return (
            <Editor
              graphColors={graphColorIdMap.map(({ graphColor }) => graphColor)}
              graphByColor={(graphColor) => {
                return graphs[graphIdByColor(graphColor)] ?? Graph.empty;
              }}
              onGraphChange={(graphColor, graph) => {
                const newGraphs = { ...graphs };
                newGraphs[graphIdByColor(graphColor)] = graph;
                setGraphs(newGraphs);
              }}
              currentGraphColor={currentGraphColor}
            />
          );
        })()}
      </div>
    );
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

const CssStringGraphColor: GraphColorInterface<string> = {
  isEqual(graphColorA, graphColorB) {
    return graphColorA === graphColorB;
  },
  toCssColor(graphColor) {
    return graphColor;
  },
  samples: ["red", "green", "blue", "yellow", "orange", "purple"],
  default: "tranparent",
};

const AppInstance = appFactory({ Graph: DictGraph, NodeId: StringNodeId, GraphColor: CssStringGraphColor });

function SimpleButton({ label, onClick, isEnabled }: { label: string; onClick(): void; isEnabled: boolean }) {
  const theme = useTheme();
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
