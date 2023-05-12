import React from "react";
import "styled-components/macro";
import { GraphInterface, NodeAttributes, NodeIdInterface } from "./core";
import { useTheme } from "./theme";

export function NodeLabelFactory<Graph, NodeId>({
  Graph,
  NodeId,
}: {
  Graph: GraphInterface<Graph, NodeId>;
  NodeId: NodeIdInterface<NodeId>;
}) {
  return function NodeLabel({
    nodeId,
    nodeAttributes,
    onNodeAttributesChange,
    isHighlighted,
    onIsHighlighted,
    isReadonly,
  }: {
    nodeId: NodeId;
    nodeAttributes: NodeAttributes<NodeId>;
    isReadonly: boolean;
    onNodeAttributesChange(nodeAttributes: NodeAttributes<NodeId> | null): void;
    isHighlighted: boolean;
    onIsHighlighted(nodeId: NodeId | null): void;
  }) {
    const theme = useTheme();
    const [text, setText] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [hasFocus, setHasFocus] = React.useState(false);
    const width = (() => {
      if (hasFocus) {
        if (text === "") return NodeId.stringify(nodeId).length;
        return text.length;
      } else {
        if (nodeAttributes.label) return nodeAttributes.label.length;
        return NodeId.stringify(nodeId).length;
      }
    })();
    const updateLabel = () => {
      onNodeAttributesChange({ ...nodeAttributes, label: text });
    };
    return (
      <input
        ref={inputRef}
        value={hasFocus ? text : nodeAttributes.label}
        onChange={(event) => {
          if (!isReadonly) setText(event.target.value);
        }}
        placeholder={NodeId.stringify(nodeId)}
        css={`
          background-color: ${isHighlighted ? theme.backgroundColorHighlight : "transparent"};
          outline: none;
          border: none;
          color: ${hasFocus ? theme.textColorSecondary : theme.textColor};
          font-size: inherit;
          font-family: inherit;
          width: ${width || 1}ch;
        `}
        onFocus={() => {
          setText(nodeAttributes.label);
          setHasFocus(true);
        }}
        onBlur={() => {
          updateLabel();
          setHasFocus(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            updateLabel();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            inputRef.current?.blur();
          }
          if (event.key === "Backspace" && event.currentTarget.value === "") {
            event.preventDefault();
            onNodeAttributesChange(null);
          }
        }}
        onMouseEnter={(event) => {
          onIsHighlighted(nodeId);
        }}
        onMouseLeave={(event) => {
          onIsHighlighted(null);
        }}
        readOnly={isReadonly}
      />
    );
  };
}
