import React from "react";
import "styled-components/macro";
import { GraphColorInterface, GraphInterface, NodeIdInterface } from "./core";
import { useTheme } from "./theme";

export function GraphColorMiniGridFactory<Graph, NodeId, GraphColor>({
  Graph,
  NodeId,
  GraphColor,
}: {
  Graph: GraphInterface<Graph, NodeId>;
  NodeId: NodeIdInterface<NodeId>;
  GraphColor: GraphColorInterface<GraphColor>;
}) {
  return function GraphColorMiniGrid({
    graphColors,
    isPresent,
    onClick,
  }: {
    graphColors: Array<GraphColor>;
    isPresent(graphColor: GraphColor): boolean;
    onClick(graphColor: GraphColor): void;
  }) {
    const allIsThere = graphColors.every((graphColor) => isPresent(graphColor));
    return (
      <div
        css={`
          display: inline-flex;
        `}
      >
        {graphColors.map((graphColor, index) => {
          return (
            <div
              key={index}
              css={`
                background-color: ${!allIsThere && isPresent(graphColor) ? graphColor : "transparent"};
                width: 1ch;
                height: 1em;
              `}
              onClick={(event) => {
                onClick(graphColor);
              }}
            ></div>
          );
        })}
      </div>
    );
  };
}
