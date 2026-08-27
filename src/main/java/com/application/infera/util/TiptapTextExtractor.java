package com.application.infera.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/* Walks a Tiptap document JSON tree and concatenates every "text" node
   into a single searchable string. Static/stateless on purpose — no
   Spring bean needed, called from NoteService whenever documentJson
   changes. */
public class TiptapTextExtractor {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static String extract(String documentJson) {
        if (documentJson == null || documentJson.isBlank()) return "";

        JsonNode root;
        try {
            root = MAPPER.readTree(documentJson);
        } catch (Exception e) {
            // Not valid JSON — legacy plain-text note, same fallback
            // extensions.js's parseDocumentJson() uses on the frontend.
            return documentJson.trim();
        }

        StringBuilder sb = new StringBuilder();
        walk(root, sb);
        return sb.toString().trim().replaceAll("\\s+", " ");
    }

    private static void walk(JsonNode node, StringBuilder sb) {
        if (node == null) return;

        if (node.isArray()) {
            for (JsonNode child : node) walk(child, sb);
            return;
        }
        if (!node.isObject()) return;

        JsonNode textNode = node.get("text");
        if (textNode != null && textNode.isTextual()) {
            sb.append(textNode.asText()).append(' ');
        }

        JsonNode content = node.get("content");
        if (content != null) walk(content, sb);
    }
}