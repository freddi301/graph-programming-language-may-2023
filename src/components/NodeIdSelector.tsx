import React from "react";
import "styled-components/macro";
import { GraphColorInterface, GraphInterface, NodeAttributes, NodeIdInterface } from "./core";
import { useTheme } from "./theme";
import { uniq, uniqWith } from "lodash";
import { GraphColorMiniGridFactory } from "./GraphColorMiniGrid";

export function NodeIdSelectorFactory<Graph, NodeId, GraphColor>({
  Graph,
  NodeId,
  GraphColor,
}: {
  Graph: GraphInterface<Graph, NodeId>;
  NodeId: NodeIdInterface<NodeId>;
  GraphColor: GraphColorInterface<GraphColor>;
}) {
  const GraphColorMiniGrid = GraphColorMiniGridFactory({ Graph, GraphColor, NodeId });
  return function NodeIdSelector({
    graphColors,
    graphByColor,
    valueNodeId,
    valueNodeAttributes,
    onChange,
    isHighlighted,
    onIsHighlighted,
    isReadonly,
    filter,
  }: {
    graphColors: Array<GraphColor>;
    graphByColor(graphColor: GraphColor): Graph;
    valueNodeId: NodeId | null;
    valueNodeAttributes: NodeAttributes<NodeId> | null;
    onChange(nodeId: NodeId | null, nodeAttributes: NodeAttributes<NodeId> | null): void;
    isHighlighted: boolean;
    onIsHighlighted(nodeId: NodeId | null): void;
    isReadonly: boolean;
    filter(nodeId: NodeId): boolean;
  }) {
    const theme = useTheme();
    const [text, setText] = React.useState("");
    const allNodeIds = uniqWith(
      graphColors.flatMap((graphColor) => Graph.getNodeIds(graphByColor(graphColor))),
      NodeId.isEqual
    );
    const suggestions = allNodeIds
      .filter(filter)
      .map((nodeId) => {
        const uniqueNodeLabels = uniq(
          graphColors.map((graphColor) => {
            return Graph.getNodeAttributes(graphByColor(graphColor), nodeId)?.label ?? "";
          })
        );
        return {
          nodeId,
          uniqueLabels: uniqueNodeLabels.map((nodeLabel) => {
            const graphColorsByLabel = graphColors.filter((graphColor) => {
              return (Graph.getNodeAttributes(graphByColor(graphColor), nodeId)?.label ?? "") === nodeLabel;
            });
            return { nodeLabel, graphColorsByLabel };
          }),
        };
      })
      .sort((a, b) => {
        const getMinDistance = (x: { uniqueLabels: Array<{ nodeLabel: string }> }) =>
          Math.min(...x.uniqueLabels.map(({ nodeLabel }) => getLevenshteinDistance(text, nodeLabel)));
        return getMinDistance(a) - getMinDistance(b);
      })
      .flatMap(({ nodeId, uniqueLabels }) => {
        return uniqueLabels.map(({ nodeLabel, graphColorsByLabel }) => {
          return {
            nodeId,
            nodeLabel,
            graphColorsByLabel,
          };
        });
      });
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = React.useState<number | null>(null);
    const [hasFocus, setHasFocus] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const width = (() => {
      if (hasFocus) {
        return text.length;
      } else {
        if (valueNodeAttributes?.label) return valueNodeAttributes.label.length;
        if (valueNodeId) return NodeId.stringify(valueNodeId).length;
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
            if (!isReadonly) setText(event.target.value);
          }}
          placeholder={valueNodeId ? NodeId.stringify(valueNodeId) : ""}
          css={`
            background-color: ${isHighlighted ? theme.backgroundColorHighlight : "transparent"};
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
            if (event.key === "Enter") {
              event.preventDefault();
              if (text === "" && selectedSuggestionIndex === null) {
                console.log("bingo");
                onChange(null, null);
              } else if (selectedSuggestionIndex !== null) {
                const selectedNode = suggestions[selectedSuggestionIndex];
                if (selectedNode) {
                  onChange(
                    selectedNode.nodeId,
                    Graph.getNodeAttributes(graphByColor(selectedNode.graphColorsByLabel[0]), selectedNode.nodeId)
                  );
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
            if (valueNodeId) onIsHighlighted(valueNodeId);
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
            if (valueNodeId) onIsHighlighted(valueNodeId);
          }}
          onMouseLeave={(event) => {
            onIsHighlighted(null);
          }}
          readOnly={isReadonly}
        />
        {hasFocus && !isReadonly && (
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
            {suggestions.map(({ nodeId, nodeLabel, graphColorsByLabel }, index) => {
              const isSelected = selectedSuggestionIndex === index;
              const isNodeIdHihghlighted = nodeId === suggestions[selectedSuggestionIndex!]?.nodeId;
              return (
                <div
                  key={index}
                  css={`
                    background-color: ${isSelected ? theme.backgroundColorHighlight : theme.backgroundColorSecondary};
                    padding-right: 1ch;
                    border-left: 1ch solid ${isNodeIdHihghlighted ? theme.backgroundColorHighlight : "transparent"};
                  `}
                  onMouseEnter={(event) => {
                    onIsHighlighted(nodeId);
                  }}
                  onMouseLeave={(event) => {
                    onIsHighlighted(null);
                  }}
                >
                  <GraphColorMiniGrid
                    graphColors={graphColors}
                    isPresent={(graphColor) => graphColorsByLabel.some((gc) => GraphColor.isEqual(gc, graphColor))}
                    onClick={() => {}}
                  />
                  {nodeLabel || NodeId.stringify(nodeId)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };
}

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
