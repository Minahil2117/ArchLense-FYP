import test from "node:test";
import assert from "node:assert/strict";

// Import layout and adapter functions
import { calculateArchitectureLayout } from "../src/components/flow/graphLayout";
import { convertArchitectureGraphToReactFlow } from "../src/components/flow/graphAdapter";
import { ArchitectureGraph, Node, Edge } from "../src/types/architecture";

test("calculateArchitectureLayout - generates valid coordinates for hierarchical graph", () => {
  const nodes: Node[] = [
    { id: "client1", label: "Mobile Client", type: "client" },
    { id: "gw1", label: "API Gateway", type: "api_gateway" },
    { id: "svc1", label: "Order Service", type: "service" },
    { id: "db1", label: "Order DB", type: "database" },
  ];

  const edges: Edge[] = [
    { source: "client1", target: "gw1", communication: "sync_http" },
    { source: "gw1", target: "svc1", communication: "sync_http" },
    { source: "svc1", target: "db1", communication: "database_access" },
  ];

  const positions = calculateArchitectureLayout(nodes, edges, { direction: "LR" });

  assert.equal(positions.size, 4);

  const clientPos = positions.get("client1")!;
  const gwPos = positions.get("gw1")!;
  const svcPos = positions.get("svc1")!;
  const dbPos = positions.get("db1")!;

  assert.ok(clientPos.x < gwPos.x, "Client should be to the left of Gateway");
  assert.ok(gwPos.x < svcPos.x, "Gateway should be to the left of Service");
  assert.ok(svcPos.x < dbPos.x, "Service should be to the left of Database");

  for (const pos of positions.values()) {
    assert.ok(Number.isFinite(pos.x));
    assert.ok(Number.isFinite(pos.y));
  }
});

test("calculateArchitectureLayout - handles directed cycles without infinite recursion", () => {
  const nodes: Node[] = [
    { id: "svc_a", label: "Service A", type: "service" },
    { id: "svc_b", label: "Service B", type: "service" },
    { id: "svc_c", label: "Service C", type: "service" },
  ];

  // A -> B -> C -> A (Directed cycle)
  const edges: Edge[] = [
    { source: "svc_a", target: "svc_b", communication: "sync_http" },
    { source: "svc_b", target: "svc_c", communication: "sync_http" },
    { source: "svc_c", target: "svc_a", communication: "sync_http" },
  ];

  const positions = calculateArchitectureLayout(nodes, edges);
  assert.equal(positions.size, 3);
  for (const pos of positions.values()) {
    assert.ok(Number.isFinite(pos.x));
    assert.ok(Number.isFinite(pos.y));
  }
});

test("convertArchitectureGraphToReactFlow - converts nodes and edges correctly", () => {
  const graph: ArchitectureGraph = {
    architecture_id: "test-arch",
    source_format: "mermaid",
    parse_warnings: [],
    nodes: [
      { id: "gw", label: "Kong Gateway", type: "api_gateway" },
      { id: "order_svc", label: "Order Service", type: "service" },
      { id: "order_db", label: "Order DB", type: "database" },
      { id: "event_bus", label: "Kafka", type: "message_broker" },
    ],
    edges: [
      { source: "gw", target: "order_svc", communication: "sync_http", protocol: "HTTP" },
      { source: "order_svc", target: "order_db", communication: "database_access" },
      { source: "order_svc", target: "event_bus", communication: "async_message" },
    ],
  };

  const result = convertArchitectureGraphToReactFlow({ graph });

  assert.equal(result.nodeCount, 4);
  assert.equal(result.edgeCount, 3);

  const orderSvcNode = result.nodes.find((n) => n.id === "order_svc")!;
  assert.ok(orderSvcNode);
  assert.equal(orderSvcNode.data.label, "Order Service");
  assert.equal(orderSvcNode.data.type, "service");
  assert.equal(orderSvcNode.data.highlightState, "normal");
  assert.equal(orderSvcNode.data.inDegree, 1);
  assert.equal(orderSvcNode.data.outDegree, 2);

  const asyncEdge = result.edges.find((e) => e.target === "event_bus")!;
  assert.ok(asyncEdge);
  assert.equal(asyncEdge.data?.communication, "async_message");
  assert.equal(asyncEdge.animated, true);
});

test("convertArchitectureGraphToReactFlow - filters out invalid edge endpoints safely", () => {
  const graph: ArchitectureGraph = {
    architecture_id: "test-broken",
    source_format: "mermaid",
    parse_warnings: [],
    nodes: [{ id: "n1", label: "Service 1", type: "service" }],
    edges: [
      { source: "n1", target: "non_existent_node", communication: "sync_http" },
      { source: "ghost_source", target: "n1", communication: "sync_http" },
    ],
  };

  const result = convertArchitectureGraphToReactFlow({ graph });
  assert.equal(result.nodeCount, 1);
  assert.equal(result.edgeCount, 0, "Invalid edges pointing to non-existent nodes should be safely filtered");
});

test("convertArchitectureGraphToReactFlow - finding-based highlighting logic", () => {
  const graph: ArchitectureGraph = {
    architecture_id: "test-highlight",
    source_format: "mermaid",
    parse_warnings: [],
    nodes: [
      { id: "order_svc", label: "Order Service", type: "service" },
      { id: "payment_svc", label: "Payment Service", type: "service" },
      { id: "shared_db", label: "Shared DB", type: "database" },
      { id: "analytics_svc", label: "Analytics Service", type: "service" },
    ],
    edges: [
      { source: "order_svc", target: "shared_db", communication: "database_access" },
      { source: "payment_svc", target: "shared_db", communication: "database_access" },
      { source: "analytics_svc", target: "shared_db", communication: "database_access" },
    ],
  };

  // User clicks finding affecting order_svc and shared_db
  const highlightedNodeIds = ["order_svc", "shared_db"];

  const result = convertArchitectureGraphToReactFlow({
    graph,
    highlightedNodeIds,
  });

  const orderNode = result.nodes.find((n) => n.id === "order_svc")!;
  const sharedDbNode = result.nodes.find((n) => n.id === "shared_db")!;
  const paymentNode = result.nodes.find((n) => n.id === "payment_svc")!;
  const analyticsNode = result.nodes.find((n) => n.id === "analytics_svc")!;

  assert.equal(orderNode.data.highlightState, "highlighted");
  assert.equal(sharedDbNode.data.highlightState, "highlighted");
  assert.equal(paymentNode.data.highlightState, "dimmed");
  assert.equal(analyticsNode.data.highlightState, "dimmed");

  // Edge between two highlighted nodes should be highlighted
  const orderToDbEdge = result.edges.find((e) => e.source === "order_svc" && e.target === "shared_db")!;
  assert.equal(orderToDbEdge.data?.highlightState, "highlighted");

  // Edge from un-highlighted node should be dimmed
  const paymentToDbEdge = result.edges.find((e) => e.source === "payment_svc" && e.target === "shared_db")!;
  assert.equal(paymentToDbEdge.data?.highlightState, "dimmed");
});

test("convertArchitectureGraphToReactFlow - handles unknown affected IDs gracefully", () => {
  const graph: ArchitectureGraph = {
    architecture_id: "test-unknown-ids",
    source_format: "mermaid",
    parse_warnings: [],
    nodes: [{ id: "n1", label: "Service 1", type: "service" }],
    edges: [],
  };

  // Passing non-existent IDs
  const result = convertArchitectureGraphToReactFlow({
    graph,
    highlightedNodeIds: ["non_existent_123", "ghost_node"],
  });

  assert.equal(result.nodeCount, 1);
  const node = result.nodes[0];
  assert.equal(node.data.highlightState, "dimmed");
});

test("convertArchitectureGraphToReactFlow - handles empty or null graph", () => {
  const resultEmpty = convertArchitectureGraphToReactFlow({ graph: null });
  assert.equal(resultEmpty.nodeCount, 0);
  assert.equal(resultEmpty.edgeCount, 0);
  assert.deepEqual(resultEmpty.nodes, []);
  assert.deepEqual(resultEmpty.edges, []);
});
