# @f-o-t/pdf-renderer — Takumi-Style PDF Renderer

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Rust+WASM PDF renderer that takes JSX/CSS (Tailwind) input and generates PDFs, with framework plugins for React, Vue, and Svelte.

**Architecture:** Rust workspace with `pdf-renderer-core` (parser, layout, renderer) and `pdf-renderer-wasm` (WASM bindings). JS wrapper at `libraries/pdf-renderer/` wraps WASM module in a `PDFRenderer` class. Framework plugins serialize framework-specific component trees to JSX strings, then pass to the WASM core.

**Tech Stack:** Rust (SWC, Taffy, printpdf, resvg, wasm-bindgen), TypeScript, Bun, Zod ^4.3.6

---

## Context

**Takumi-style:** Parse JSX + Tailwind CSS in Rust, compute Flexbox layout, render to PDF. All heavy work in WASM for browser+server use.

**Two codebases:**
1. `pdf-renderer/` — Rust workspace (at repo root, NOT in `libraries/`)
2. `libraries/pdf-renderer/` — JS wrapper + framework plugins (FOT library)

**Data flow:**
```
React/Vue/Svelte Component
  → Framework Plugin serializes to JSX string
    → WASM Core parses JSX (SWC)
      → Resolves Tailwind classes to CSS properties
        → Computes Flexbox layout (Taffy)
          → Renders PDF (printpdf)
            → Returns Uint8Array (PDF bytes)
```

**Supported HTML elements (v1):** `div`, `span`, `p`, `h1`-`h6`, `img`, `svg`, `table`, `tr`, `td`, `th`, `ul`, `ol`, `li`

**Supported Tailwind classes (v1):** spacing (p-*, m-*), sizing (w-*, h-*), colors (text-*, bg-*), borders (border-*, rounded-*), flexbox (flex, items-*, justify-*), typography (text-sm/base/lg/xl/2xl, font-bold/normal), display (block, inline, flex, hidden)

---

## Task 1: Scaffold Rust Workspace

**Files:**
- Create: `pdf-renderer/Cargo.toml`
- Create: `pdf-renderer/crates/pdf-renderer-core/Cargo.toml`
- Create: `pdf-renderer/crates/pdf-renderer-core/src/lib.rs`
- Create: `pdf-renderer/crates/pdf-renderer-wasm/Cargo.toml`
- Create: `pdf-renderer/crates/pdf-renderer-wasm/src/lib.rs`

**Step 1: Create directory structure**

```bash
mkdir -p pdf-renderer/crates/pdf-renderer-core/src/{parser,layout,renderer}
mkdir -p pdf-renderer/crates/pdf-renderer-wasm/src
```

**Step 2: Write workspace Cargo.toml**

```toml
# pdf-renderer/Cargo.toml
[workspace]
members = [
    "crates/pdf-renderer-core",
    "crates/pdf-renderer-wasm",
]
resolver = "2"

[workspace.dependencies]
# JSX parsing
swc_common = { version = "5", features = ["sourcemap"] }
swc_ecma_parser = "7"
swc_ecma_ast = "5"

# CSS parsing
lightningcss = "1.0"

# Layout
taffy = "0.7"

# PDF generation
printpdf = "0.8"

# SVG rendering
resvg = "0.44"
usvg = "0.44"

# Serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# WASM
wasm-bindgen = "0.2"
console_error_panic_hook = "0.1"
js-sys = "0.3"
```

> **Note:** Exact dependency versions should be verified against crates.io at implementation time. The versions listed here are targets — update them to the latest compatible versions when scaffolding.

**Step 3: Write core crate Cargo.toml**

```toml
# pdf-renderer/crates/pdf-renderer-core/Cargo.toml
[package]
name = "pdf-renderer-core"
version = "0.1.0"
edition = "2021"

[dependencies]
swc_common = { workspace = true }
swc_ecma_parser = { workspace = true }
swc_ecma_ast = { workspace = true }
lightningcss = { workspace = true }
taffy = { workspace = true }
printpdf = { workspace = true }
resvg = { workspace = true }
usvg = { workspace = true }
serde = { workspace = true }
serde_json = { workspace = true }
```

**Step 4: Write core lib.rs**

```rust
// pdf-renderer/crates/pdf-renderer-core/src/lib.rs
pub mod parser;
pub mod layout;
pub mod renderer;

use serde::{Deserialize, Serialize};

/// A node in the component tree produced by the JSX parser
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentNode {
    pub tag: String,
    pub props: std::collections::HashMap<String, PropValue>,
    pub children: Vec<ComponentChild>,
    pub styles: StyleProperties,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ComponentChild {
    Node(ComponentNode),
    Text(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PropValue {
    String(String),
    Number(f64),
    Bool(bool),
}

/// CSS properties resolved from Tailwind classes
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct StyleProperties {
    // Spacing
    pub padding_top: Option<f32>,
    pub padding_right: Option<f32>,
    pub padding_bottom: Option<f32>,
    pub padding_left: Option<f32>,
    pub margin_top: Option<f32>,
    pub margin_right: Option<f32>,
    pub margin_bottom: Option<f32>,
    pub margin_left: Option<f32>,

    // Sizing
    pub width: Option<Dimension>,
    pub height: Option<Dimension>,
    pub min_width: Option<Dimension>,
    pub min_height: Option<Dimension>,
    pub max_width: Option<Dimension>,
    pub max_height: Option<Dimension>,

    // Colors
    pub color: Option<Color>,
    pub background_color: Option<Color>,

    // Borders
    pub border_width: Option<f32>,
    pub border_color: Option<Color>,
    pub border_radius: Option<f32>,

    // Flexbox
    pub display: Option<Display>,
    pub flex_direction: Option<FlexDirection>,
    pub align_items: Option<AlignItems>,
    pub justify_content: Option<JustifyContent>,
    pub gap: Option<f32>,
    pub flex_grow: Option<f32>,
    pub flex_shrink: Option<f32>,

    // Typography
    pub font_size: Option<f32>,
    pub font_weight: Option<FontWeight>,
    pub line_height: Option<f32>,
    pub text_align: Option<TextAlign>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Dimension {
    Px(f32),
    Percent(f32),
    Auto,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Color {
    pub r: u8,
    pub g: u8,
    pub b: u8,
    pub a: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Display {
    Block,
    Inline,
    Flex,
    Hidden,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FlexDirection {
    Row,
    Column,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AlignItems {
    Start,
    Center,
    End,
    Stretch,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum JustifyContent {
    Start,
    Center,
    End,
    SpaceBetween,
    SpaceAround,
    SpaceEvenly,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FontWeight {
    Normal,
    Bold,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TextAlign {
    Left,
    Center,
    Right,
}

/// Configuration for PDF rendering
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderConfig {
    /// Page width in points (1 point = 1/72 inch). Default: 595.0 (A4)
    pub page_width: f32,
    /// Page height in points. Default: 842.0 (A4)
    pub page_height: f32,
    /// Default font size in points. Default: 12.0
    pub default_font_size: f32,
}

impl Default for RenderConfig {
    fn default() -> Self {
        Self {
            page_width: 595.0,
            page_height: 842.0,
            default_font_size: 12.0,
        }
    }
}

/// Main entry point: JSX string → PDF bytes
pub fn render_to_pdf(jsx_source: &str, config: &RenderConfig) -> Result<Vec<u8>, RenderError> {
    let tree = parser::parse_jsx(jsx_source)?;
    let layout_tree = layout::compute_layout(&tree, config)?;
    let pdf_bytes = renderer::render_pdf(&layout_tree, config)?;
    Ok(pdf_bytes)
}

#[derive(Debug, thiserror::Error)]
pub enum RenderError {
    #[error("Parse error: {0}")]
    Parse(String),
    #[error("Layout error: {0}")]
    Layout(String),
    #[error("Render error: {0}")]
    Render(String),
}
```

> **Note:** Add `thiserror = "2"` to `[dependencies]` in core Cargo.toml.

**Step 5: Write placeholder module files**

```rust
// pdf-renderer/crates/pdf-renderer-core/src/parser/mod.rs
use crate::{ComponentNode, RenderError};

pub mod jsx;
pub mod css;

pub fn parse_jsx(source: &str) -> Result<ComponentNode, RenderError> {
    todo!("Implement in Task 2")
}
```

```rust
// pdf-renderer/crates/pdf-renderer-core/src/layout/mod.rs
use crate::{ComponentNode, RenderConfig, RenderError};

pub mod engine;

/// A node with computed layout positions
#[derive(Debug, Clone)]
pub struct LayoutNode {
    pub tag: String,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub styles: crate::StyleProperties,
    pub children: Vec<LayoutChild>,
}

#[derive(Debug, Clone)]
pub enum LayoutChild {
    Node(LayoutNode),
    Text { content: String, x: f32, y: f32 },
}

pub fn compute_layout(
    tree: &ComponentNode,
    config: &RenderConfig,
) -> Result<LayoutNode, RenderError> {
    todo!("Implement in Task 4")
}
```

```rust
// pdf-renderer/crates/pdf-renderer-core/src/renderer/mod.rs
use crate::{RenderConfig, RenderError};
use super::layout::LayoutNode;

pub mod pdf;
pub mod svg;

pub fn render_pdf(
    layout: &LayoutNode,
    config: &RenderConfig,
) -> Result<Vec<u8>, RenderError> {
    todo!("Implement in Task 5")
}
```

**Step 6: Write WASM crate lib.rs**

```rust
// pdf-renderer/crates/pdf-renderer-wasm/Cargo.toml
[package]
name = "pdf-renderer-wasm"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
pdf-renderer-core = { path = "../pdf-renderer-core" }
wasm-bindgen = { workspace = true }
console_error_panic_hook = { workspace = true }
js-sys = { workspace = true }
serde = { workspace = true }
serde_json = { workspace = true }
serde-wasm-bindgen = "0.6"
```

```rust
// pdf-renderer/crates/pdf-renderer-wasm/src/lib.rs
use wasm_bindgen::prelude::*;
use pdf_renderer_core::RenderConfig;

#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub fn render_to_pdf(jsx_source: &str, config_json: &str) -> Result<Vec<u8>, JsError> {
    let config: RenderConfig = serde_json::from_str(config_json)
        .map_err(|e| JsError::new(&format!("Invalid config: {e}")))?;

    pdf_renderer_core::render_to_pdf(jsx_source, &config)
        .map_err(|e| JsError::new(&e.to_string()))
}
```

**Step 7: Verify workspace compiles**

Run: `cd pdf-renderer && cargo check`

Expected: Compiles (with `todo!()` warnings)

**Step 8: Commit**

```bash
git add pdf-renderer/
git commit -m "chore(pdf-renderer): scaffold Rust workspace with core + wasm crates"
```

---

## Task 2: JSX Parser

**Files:**
- Create: `pdf-renderer/crates/pdf-renderer-core/src/parser/jsx.rs`
- Create: `pdf-renderer/crates/pdf-renderer-core/src/parser/css.rs`
- Modify: `pdf-renderer/crates/pdf-renderer-core/src/parser/mod.rs`

**Step 1: Write failing tests for JSX parsing**

```rust
// pdf-renderer/crates/pdf-renderer-core/src/parser/jsx.rs
use crate::{ComponentChild, ComponentNode, PropValue, RenderError};
use swc_common::{FileName, SourceMap, sync::Lrc};
use swc_ecma_parser::{Parser, StringInput, Syntax, TsSyntax};
use swc_ecma_ast::*;
use std::collections::HashMap;

/// Parse a JSX string into a ComponentNode tree
pub fn parse(source: &str) -> Result<ComponentNode, RenderError> {
    let cm: Lrc<SourceMap> = Default::default();
    let fm = cm.new_source_file(Lrc::new(FileName::Custom("input.tsx".into())), source.into());

    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax {
            tsx: true,
            ..Default::default()
        }),
        StringInput::from(&*fm),
        None,
    );

    let module = parser
        .parse_module()
        .map_err(|e| RenderError::Parse(format!("{e:?}")))?;

    // Find the default export or the last expression statement
    for item in &module.body {
        if let ModuleItem::Stmt(Stmt::Expr(expr_stmt)) = item {
            if let Expr::JSXElement(jsx) = &*expr_stmt.expr {
                return convert_jsx_element(jsx);
            }
        }
    }

    // Try finding JSX in return statements, arrow functions, etc.
    find_jsx_in_module(&module)
        .ok_or_else(|| RenderError::Parse("No JSX element found in source".into()))
}

fn find_jsx_in_module(module: &Module) -> Option<ComponentNode> {
    for item in &module.body {
        match item {
            ModuleItem::Stmt(stmt) => {
                if let Some(node) = find_jsx_in_stmt(stmt) {
                    return Some(node);
                }
            }
            ModuleItem::ModuleDecl(ModuleDecl::ExportDefaultExpr(export)) => {
                if let Expr::JSXElement(jsx) = &*export.expr {
                    return convert_jsx_element(jsx).ok();
                }
            }
            _ => {}
        }
    }
    None
}

fn find_jsx_in_stmt(stmt: &Stmt) -> Option<ComponentNode> {
    match stmt {
        Stmt::Expr(expr_stmt) => find_jsx_in_expr(&expr_stmt.expr),
        Stmt::Return(ret) => ret.arg.as_ref().and_then(|e| find_jsx_in_expr(e)),
        _ => None,
    }
}

fn find_jsx_in_expr(expr: &Expr) -> Option<ComponentNode> {
    match expr {
        Expr::JSXElement(jsx) => convert_jsx_element(jsx).ok(),
        Expr::Paren(paren) => find_jsx_in_expr(&paren.expr),
        Expr::Arrow(arrow) => match &*arrow.body {
            BlockStmtOrExpr::Expr(e) => find_jsx_in_expr(e),
            BlockStmtOrExpr::BlockStmt(block) => {
                for stmt in &block.stmts {
                    if let Some(node) = find_jsx_in_stmt(stmt) {
                        return Some(node);
                    }
                }
                None
            }
        },
        _ => None,
    }
}

fn convert_jsx_element(jsx: &JSXElement) -> Result<ComponentNode, RenderError> {
    let tag = extract_tag_name(&jsx.opening.name)?;
    let props = extract_props(&jsx.opening.attrs);
    let class_name = props.get("className")
        .and_then(|v| match v {
            PropValue::String(s) => Some(s.clone()),
            _ => None,
        });

    let children = jsx.children.iter()
        .filter_map(|child| convert_jsx_child(child).ok())
        .flatten()
        .collect();

    let styles = class_name
        .as_deref()
        .map(super::css::parse_tailwind_classes)
        .unwrap_or_default();

    Ok(ComponentNode {
        tag,
        props,
        children,
        styles,
    })
}

fn extract_tag_name(name: &JSXElementName) -> Result<String, RenderError> {
    match name {
        JSXElementName::Ident(ident) => Ok(ident.sym.to_string()),
        JSXElementName::JSXMemberExpr(member) => {
            Ok(format!("{}.{}", member.obj, member.prop))
        }
        JSXElementName::JSXNamespacedName(ns) => {
            Ok(format!("{}:{}", ns.ns, ns.name))
        }
    }
}

fn extract_props(attrs: &[JSXAttrOrSpread]) -> HashMap<String, PropValue> {
    let mut props = HashMap::new();
    for attr in attrs {
        if let JSXAttrOrSpread::JSXAttr(jsx_attr) = attr {
            if let JSXAttrName::Ident(name) = &jsx_attr.name {
                let key = name.sym.to_string();
                let value = jsx_attr.value.as_ref()
                    .map(extract_attr_value)
                    .unwrap_or(PropValue::Bool(true));
                props.insert(key, value);
            }
        }
    }
    props
}

fn extract_attr_value(value: &JSXAttrValue) -> PropValue {
    match value {
        JSXAttrValue::Lit(Lit::Str(s)) => PropValue::String(s.value.to_string()),
        JSXAttrValue::Lit(Lit::Num(n)) => PropValue::Number(n.value),
        JSXAttrValue::Lit(Lit::Bool(b)) => PropValue::Bool(b.value),
        JSXAttrValue::JSXExprContainer(expr) => {
            match &expr.expr {
                JSXExpr::Expr(e) => match &**e {
                    Expr::Lit(Lit::Str(s)) => PropValue::String(s.value.to_string()),
                    Expr::Lit(Lit::Num(n)) => PropValue::Number(n.value),
                    Expr::Lit(Lit::Bool(b)) => PropValue::Bool(b.value),
                    Expr::Tpl(tpl) => {
                        // Template literals: join quasis
                        let s: String = tpl.quasis.iter()
                            .map(|q| q.raw.to_string())
                            .collect();
                        PropValue::String(s)
                    }
                    _ => PropValue::String("[expression]".into()),
                },
                _ => PropValue::String("[expression]".into()),
            }
        }
        _ => PropValue::String("[unknown]".into()),
    }
}

fn convert_jsx_child(child: &JSXElementChild) -> Result<Vec<ComponentChild>, RenderError> {
    match child {
        JSXElementChild::JSXElement(el) => {
            Ok(vec![ComponentChild::Node(convert_jsx_element(el)?)])
        }
        JSXElementChild::JSXText(text) => {
            let trimmed = text.value.trim().to_string();
            if trimmed.is_empty() {
                Ok(vec![])
            } else {
                Ok(vec![ComponentChild::Text(trimmed)])
            }
        }
        JSXElementChild::JSXExprContainer(expr) => {
            match &expr.expr {
                JSXExpr::Expr(e) => {
                    match &**e {
                        Expr::Lit(Lit::Str(s)) => {
                            Ok(vec![ComponentChild::Text(s.value.to_string())])
                        }
                        _ => Ok(vec![ComponentChild::Text("[expression]".into())]),
                    }
                }
                _ => Ok(vec![]),
            }
        }
        JSXElementChild::JSXFragment(frag) => {
            let mut children = Vec::new();
            for c in &frag.children {
                children.extend(convert_jsx_child(c)?);
            }
            Ok(children)
        }
        _ => Ok(vec![]),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_simple_div() {
        let jsx = r#"<div className="p-4">Hello</div>"#;
        let node = parse(jsx).unwrap();
        assert_eq!(node.tag, "div");
        assert_eq!(node.children.len(), 1);
        match &node.children[0] {
            ComponentChild::Text(t) => assert_eq!(t, "Hello"),
            _ => panic!("Expected text child"),
        }
    }

    #[test]
    fn parse_nested_elements() {
        let jsx = r#"<div><span>inner</span></div>"#;
        let node = parse(jsx).unwrap();
        assert_eq!(node.tag, "div");
        assert_eq!(node.children.len(), 1);
        match &node.children[0] {
            ComponentChild::Node(child) => {
                assert_eq!(child.tag, "span");
            }
            _ => panic!("Expected node child"),
        }
    }

    #[test]
    fn parse_props() {
        let jsx = r#"<div className="flex" id="main">content</div>"#;
        let node = parse(jsx).unwrap();
        assert_eq!(
            node.props.get("className"),
            Some(&PropValue::String("flex".into()))
        );
        assert_eq!(
            node.props.get("id"),
            Some(&PropValue::String("main".into()))
        );
    }

    #[test]
    fn parse_heading_tags() {
        let jsx = r#"<h1 className="text-2xl font-bold">Title</h1>"#;
        let node = parse(jsx).unwrap();
        assert_eq!(node.tag, "h1");
    }

    #[test]
    fn parse_multiple_children() {
        let jsx = r#"<div><h1>Title</h1><p>Body</p></div>"#;
        let node = parse(jsx).unwrap();
        assert_eq!(node.children.len(), 2);
    }
}
```

**Step 2: Run tests to verify they fail (because css module not yet implemented)**

Run: `cd pdf-renderer && cargo test -p pdf-renderer-core`

Expected: Compilation error — `css` module missing

**Step 3: Write CSS/Tailwind parser stub**

```rust
// pdf-renderer/crates/pdf-renderer-core/src/parser/css.rs
use crate::{
    AlignItems, Color, Dimension, Display, FlexDirection, FontWeight,
    JustifyContent, StyleProperties, TextAlign,
};

/// Parse Tailwind utility classes into StyleProperties
pub fn parse_tailwind_classes(class_string: &str) -> StyleProperties {
    let mut styles = StyleProperties::default();

    for class in class_string.split_whitespace() {
        apply_class(&mut styles, class);
    }

    styles
}

fn apply_class(styles: &mut StyleProperties, class: &str) {
    match class {
        // Display
        "block" => styles.display = Some(Display::Block),
        "inline" => styles.display = Some(Display::Inline),
        "flex" => styles.display = Some(Display::Flex),
        "hidden" => styles.display = Some(Display::Hidden),

        // Flex direction
        "flex-row" => styles.flex_direction = Some(FlexDirection::Row),
        "flex-col" => styles.flex_direction = Some(FlexDirection::Column),

        // Align items
        "items-start" => styles.align_items = Some(AlignItems::Start),
        "items-center" => styles.align_items = Some(AlignItems::Center),
        "items-end" => styles.align_items = Some(AlignItems::End),
        "items-stretch" => styles.align_items = Some(AlignItems::Stretch),

        // Justify content
        "justify-start" => styles.justify_content = Some(JustifyContent::Start),
        "justify-center" => styles.justify_content = Some(JustifyContent::Center),
        "justify-end" => styles.justify_content = Some(JustifyContent::End),
        "justify-between" => styles.justify_content = Some(JustifyContent::SpaceBetween),
        "justify-around" => styles.justify_content = Some(JustifyContent::SpaceAround),
        "justify-evenly" => styles.justify_content = Some(JustifyContent::SpaceEvenly),

        // Font weight
        "font-normal" => styles.font_weight = Some(FontWeight::Normal),
        "font-bold" => styles.font_weight = Some(FontWeight::Bold),

        // Text align
        "text-left" => styles.text_align = Some(TextAlign::Left),
        "text-center" => styles.text_align = Some(TextAlign::Center),
        "text-right" => styles.text_align = Some(TextAlign::Right),

        _ => {
            // Try prefix-based parsing
            parse_prefixed_class(styles, class);
        }
    }
}

fn parse_prefixed_class(styles: &mut StyleProperties, class: &str) {
    // Spacing: p-{n}, px-{n}, py-{n}, pt-{n}, etc.
    if let Some(val) = class.strip_prefix("p-") {
        if let Some(px) = spacing_to_px(val) {
            styles.padding_top = Some(px);
            styles.padding_right = Some(px);
            styles.padding_bottom = Some(px);
            styles.padding_left = Some(px);
        }
    } else if let Some(val) = class.strip_prefix("px-") {
        if let Some(px) = spacing_to_px(val) {
            styles.padding_left = Some(px);
            styles.padding_right = Some(px);
        }
    } else if let Some(val) = class.strip_prefix("py-") {
        if let Some(px) = spacing_to_px(val) {
            styles.padding_top = Some(px);
            styles.padding_bottom = Some(px);
        }
    } else if let Some(val) = class.strip_prefix("pt-") {
        if let Some(px) = spacing_to_px(val) {
            styles.padding_top = Some(px);
        }
    } else if let Some(val) = class.strip_prefix("pr-") {
        if let Some(px) = spacing_to_px(val) {
            styles.padding_right = Some(px);
        }
    } else if let Some(val) = class.strip_prefix("pb-") {
        if let Some(px) = spacing_to_px(val) {
            styles.padding_bottom = Some(px);
        }
    } else if let Some(val) = class.strip_prefix("pl-") {
        if let Some(px) = spacing_to_px(val) {
            styles.padding_left = Some(px);
        }
    }
    // Margin
    else if let Some(val) = class.strip_prefix("m-") {
        if let Some(px) = spacing_to_px(val) {
            styles.margin_top = Some(px);
            styles.margin_right = Some(px);
            styles.margin_bottom = Some(px);
            styles.margin_left = Some(px);
        }
    } else if let Some(val) = class.strip_prefix("mx-") {
        if let Some(px) = spacing_to_px(val) {
            styles.margin_left = Some(px);
            styles.margin_right = Some(px);
        }
    } else if let Some(val) = class.strip_prefix("my-") {
        if let Some(px) = spacing_to_px(val) {
            styles.margin_top = Some(px);
            styles.margin_bottom = Some(px);
        }
    }
    // Sizing: w-{n}, h-{n}
    else if let Some(val) = class.strip_prefix("w-") {
        styles.width = parse_dimension(val);
    } else if let Some(val) = class.strip_prefix("h-") {
        styles.height = parse_dimension(val);
    }
    // Typography: text-{size}
    else if let Some(val) = class.strip_prefix("text-") {
        if let Some(size) = text_size_to_px(val) {
            styles.font_size = Some(size);
        } else if let Some(color) = parse_color(val) {
            styles.color = Some(color);
        }
    }
    // Background: bg-{color}
    else if let Some(val) = class.strip_prefix("bg-") {
        if let Some(color) = parse_color(val) {
            styles.background_color = Some(color);
        }
    }
    // Border
    else if class == "border" {
        styles.border_width = Some(1.0);
        styles.border_color = Some(Color { r: 229, g: 231, b: 235, a: 1.0 }); // gray-200
    } else if let Some(val) = class.strip_prefix("border-") {
        if let Ok(width) = val.parse::<f32>() {
            styles.border_width = Some(width);
        } else if let Some(color) = parse_color(val) {
            styles.border_color = Some(color);
        }
    }
    // Border radius
    else if class == "rounded" {
        styles.border_radius = Some(4.0);
    } else if let Some(val) = class.strip_prefix("rounded-") {
        styles.border_radius = match val {
            "none" => Some(0.0),
            "sm" => Some(2.0),
            "md" => Some(6.0),
            "lg" => Some(8.0),
            "xl" => Some(12.0),
            "2xl" => Some(16.0),
            "full" => Some(9999.0),
            _ => None,
        };
    }
    // Gap
    else if let Some(val) = class.strip_prefix("gap-") {
        if let Some(px) = spacing_to_px(val) {
            styles.gap = Some(px);
        }
    }
    // Flex grow/shrink
    else if class == "flex-1" {
        styles.flex_grow = Some(1.0);
        styles.flex_shrink = Some(1.0);
    } else if class == "flex-grow" || class == "grow" {
        styles.flex_grow = Some(1.0);
    } else if class == "flex-shrink" || class == "shrink" {
        styles.flex_shrink = Some(1.0);
    }
}

/// Convert Tailwind spacing scale to pixels (1 unit = 4px)
fn spacing_to_px(value: &str) -> Option<f32> {
    match value {
        "0" => Some(0.0),
        "0.5" => Some(2.0),
        "1" => Some(4.0),
        "1.5" => Some(6.0),
        "2" => Some(8.0),
        "2.5" => Some(10.0),
        "3" => Some(12.0),
        "3.5" => Some(14.0),
        "4" => Some(16.0),
        "5" => Some(20.0),
        "6" => Some(24.0),
        "7" => Some(28.0),
        "8" => Some(32.0),
        "9" => Some(36.0),
        "10" => Some(40.0),
        "11" => Some(44.0),
        "12" => Some(48.0),
        "14" => Some(56.0),
        "16" => Some(64.0),
        "20" => Some(80.0),
        "24" => Some(96.0),
        "28" => Some(112.0),
        "32" => Some(128.0),
        "36" => Some(144.0),
        "40" => Some(160.0),
        "44" => Some(176.0),
        "48" => Some(192.0),
        "52" => Some(208.0),
        "56" => Some(224.0),
        "60" => Some(240.0),
        "64" => Some(256.0),
        "72" => Some(288.0),
        "80" => Some(320.0),
        "96" => Some(384.0),
        _ => value.parse::<f32>().ok().map(|v| v * 4.0),
    }
}

fn parse_dimension(value: &str) -> Option<Dimension> {
    match value {
        "auto" => Some(Dimension::Auto),
        "full" => Some(Dimension::Percent(100.0)),
        "1/2" => Some(Dimension::Percent(50.0)),
        "1/3" => Some(Dimension::Percent(33.333)),
        "2/3" => Some(Dimension::Percent(66.667)),
        "1/4" => Some(Dimension::Percent(25.0)),
        "3/4" => Some(Dimension::Percent(75.0)),
        "screen" => Some(Dimension::Percent(100.0)),
        _ => spacing_to_px(value).map(Dimension::Px),
    }
}

fn text_size_to_px(value: &str) -> Option<f32> {
    match value {
        "xs" => Some(12.0),
        "sm" => Some(14.0),
        "base" => Some(16.0),
        "lg" => Some(18.0),
        "xl" => Some(20.0),
        "2xl" => Some(24.0),
        "3xl" => Some(30.0),
        "4xl" => Some(36.0),
        "5xl" => Some(48.0),
        "6xl" => Some(60.0),
        _ => None,
    }
}

fn parse_color(value: &str) -> Option<Color> {
    match value {
        "black" => Some(Color { r: 0, g: 0, b: 0, a: 1.0 }),
        "white" => Some(Color { r: 255, g: 255, b: 255, a: 1.0 }),
        "transparent" => Some(Color { r: 0, g: 0, b: 0, a: 0.0 }),

        // Gray scale
        "gray-50" => Some(Color { r: 249, g: 250, b: 251, a: 1.0 }),
        "gray-100" => Some(Color { r: 243, g: 244, b: 246, a: 1.0 }),
        "gray-200" => Some(Color { r: 229, g: 231, b: 235, a: 1.0 }),
        "gray-300" => Some(Color { r: 209, g: 213, b: 219, a: 1.0 }),
        "gray-400" => Some(Color { r: 156, g: 163, b: 175, a: 1.0 }),
        "gray-500" => Some(Color { r: 107, g: 114, b: 128, a: 1.0 }),
        "gray-600" => Some(Color { r: 75, g: 85, b: 99, a: 1.0 }),
        "gray-700" => Some(Color { r: 55, g: 65, b: 81, a: 1.0 }),
        "gray-800" => Some(Color { r: 31, g: 41, b: 55, a: 1.0 }),
        "gray-900" => Some(Color { r: 17, g: 24, b: 39, a: 1.0 }),

        // Red
        "red-500" => Some(Color { r: 239, g: 68, b: 68, a: 1.0 }),
        "red-600" => Some(Color { r: 220, g: 38, b: 38, a: 1.0 }),

        // Blue
        "blue-500" => Some(Color { r: 59, g: 130, b: 246, a: 1.0 }),
        "blue-600" => Some(Color { r: 37, g: 99, b: 235, a: 1.0 }),

        // Green
        "green-500" => Some(Color { r: 34, g: 197, b: 94, a: 1.0 }),
        "green-600" => Some(Color { r: 22, g: 163, b: 74, a: 1.0 }),

        // Yellow
        "yellow-500" => Some(Color { r: 234, g: 179, b: 8, a: 1.0 }),

        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_padding() {
        let styles = parse_tailwind_classes("p-4");
        assert_eq!(styles.padding_top, Some(16.0));
        assert_eq!(styles.padding_right, Some(16.0));
        assert_eq!(styles.padding_bottom, Some(16.0));
        assert_eq!(styles.padding_left, Some(16.0));
    }

    #[test]
    fn parse_directional_padding() {
        let styles = parse_tailwind_classes("px-2 py-4");
        assert_eq!(styles.padding_left, Some(8.0));
        assert_eq!(styles.padding_right, Some(8.0));
        assert_eq!(styles.padding_top, Some(16.0));
        assert_eq!(styles.padding_bottom, Some(16.0));
    }

    #[test]
    fn parse_flexbox() {
        let styles = parse_tailwind_classes("flex flex-col items-center justify-between gap-4");
        assert!(matches!(styles.display, Some(Display::Flex)));
        assert!(matches!(styles.flex_direction, Some(FlexDirection::Column)));
        assert!(matches!(styles.align_items, Some(AlignItems::Center)));
        assert!(matches!(styles.justify_content, Some(JustifyContent::SpaceBetween)));
        assert_eq!(styles.gap, Some(16.0));
    }

    #[test]
    fn parse_text_sizes() {
        let styles = parse_tailwind_classes("text-2xl font-bold");
        assert_eq!(styles.font_size, Some(24.0));
        assert!(matches!(styles.font_weight, Some(FontWeight::Bold)));
    }

    #[test]
    fn parse_colors() {
        let styles = parse_tailwind_classes("text-gray-900 bg-white");
        assert!(styles.color.is_some());
        let color = styles.color.unwrap();
        assert_eq!(color.r, 17);
        assert!(styles.background_color.is_some());
    }

    #[test]
    fn parse_border() {
        let styles = parse_tailwind_classes("border rounded-lg");
        assert_eq!(styles.border_width, Some(1.0));
        assert_eq!(styles.border_radius, Some(8.0));
    }

    #[test]
    fn parse_dimensions() {
        let styles = parse_tailwind_classes("w-full h-auto");
        assert!(matches!(styles.width, Some(Dimension::Percent(100.0))));
        assert!(matches!(styles.height, Some(Dimension::Auto)));
    }
}
```

**Step 4: Update parser/mod.rs**

```rust
// pdf-renderer/crates/pdf-renderer-core/src/parser/mod.rs
use crate::{ComponentNode, RenderError};

pub mod jsx;
pub mod css;

pub fn parse_jsx(source: &str) -> Result<ComponentNode, RenderError> {
    jsx::parse(source)
}
```

**Step 5: Run tests**

Run: `cd pdf-renderer && cargo test -p pdf-renderer-core parser`

Expected: All parser tests pass

**Step 6: Commit**

```bash
git add pdf-renderer/crates/pdf-renderer-core/src/parser/
git commit -m "feat(pdf-renderer): add JSX parser (SWC) and Tailwind CSS parser"
```

---

## Task 3: CSS Parser Tests + Edge Cases

**Files:**
- Modify: `pdf-renderer/crates/pdf-renderer-core/src/parser/css.rs` (add tests)

**Step 1: Write additional CSS parser tests for edge cases**

Add to `css.rs` test module:

```rust
#[test]
fn parse_empty_string() {
    let styles = parse_tailwind_classes("");
    assert!(styles.padding_top.is_none());
    assert!(styles.display.is_none());
}

#[test]
fn parse_unknown_classes_ignored() {
    let styles = parse_tailwind_classes("p-4 some-unknown-class another-one");
    assert_eq!(styles.padding_top, Some(16.0));
    // Unknown classes silently ignored
}

#[test]
fn parse_margin() {
    let styles = parse_tailwind_classes("m-2 mx-4");
    // mx-4 overrides m-2 for left/right
    assert_eq!(styles.margin_left, Some(16.0));
    assert_eq!(styles.margin_right, Some(16.0));
    assert_eq!(styles.margin_top, Some(8.0));
    assert_eq!(styles.margin_bottom, Some(8.0));
}

#[test]
fn parse_width_fractions() {
    let styles = parse_tailwind_classes("w-1/2");
    assert!(matches!(styles.width, Some(Dimension::Percent(p)) if (p - 50.0).abs() < 0.1));
}
```

**Step 2: Run tests**

Run: `cd pdf-renderer && cargo test -p pdf-renderer-core parser::css`

Expected: All pass

**Step 3: Commit**

```bash
git add pdf-renderer/crates/pdf-renderer-core/src/parser/css.rs
git commit -m "test(pdf-renderer): add edge case tests for Tailwind CSS parser"
```

---

## Task 4: Layout Engine (Taffy)

**Files:**
- Create: `pdf-renderer/crates/pdf-renderer-core/src/layout/engine.rs`
- Modify: `pdf-renderer/crates/pdf-renderer-core/src/layout/mod.rs`

**Step 1: Write failing tests**

```rust
// pdf-renderer/crates/pdf-renderer-core/src/layout/engine.rs

use crate::{
    ComponentChild, ComponentNode, Dimension, Display, FlexDirection,
    RenderConfig, RenderError, StyleProperties,
};
use super::{LayoutChild, LayoutNode};
use taffy::prelude::*;
use std::collections::HashMap;

/// Compute layout for a component tree using Taffy (Flexbox)
pub fn compute(
    root: &ComponentNode,
    config: &RenderConfig,
) -> Result<LayoutNode, RenderError> {
    let mut tree = TaffyTree::new();
    let mut node_map: HashMap<NodeId, NodeInfo> = HashMap::new();

    let root_id = build_taffy_tree(&mut tree, &mut node_map, root, config)?;

    tree.compute_layout(
        root_id,
        Size {
            width: AvailableSpace::Definite(config.page_width),
            height: AvailableSpace::Definite(config.page_height),
        },
    )
    .map_err(|e| RenderError::Layout(format!("{e:?}")))?;

    extract_layout(&tree, &node_map, root_id, 0.0, 0.0)
}

struct NodeInfo {
    tag: String,
    styles: StyleProperties,
    children_info: Vec<ChildInfo>,
}

enum ChildInfo {
    Node(NodeId),
    Text(String),
}

fn build_taffy_tree(
    tree: &mut TaffyTree,
    node_map: &mut HashMap<NodeId, NodeInfo>,
    node: &ComponentNode,
    config: &RenderConfig,
) -> Result<NodeId, RenderError> {
    let style = to_taffy_style(&node.styles, config);
    let mut taffy_children = Vec::new();
    let mut children_info = Vec::new();

    for child in &node.children {
        match child {
            ComponentChild::Node(child_node) => {
                let child_id = build_taffy_tree(tree, node_map, child_node, config)?;
                taffy_children.push(child_id);
                children_info.push(ChildInfo::Node(child_id));
            }
            ComponentChild::Text(text) => {
                // Text nodes get a fixed-size leaf based on font size
                let font_size = node.styles.font_size.unwrap_or(config.default_font_size);
                let char_width = font_size * 0.6; // Approximate character width
                let text_width = text.len() as f32 * char_width;
                let line_height = node.styles.line_height.unwrap_or(font_size * 1.5);

                let text_style = Style {
                    size: Size {
                        width: Dimension::Length(text_width.min(config.page_width)),
                        height: Dimension::Length(line_height),
                    },
                    ..Default::default()
                };

                let text_id = tree.new_leaf(text_style)
                    .map_err(|e| RenderError::Layout(format!("{e:?}")))?;
                taffy_children.push(text_id);
                children_info.push(ChildInfo::Text(text.clone()));
            }
        }
    }

    let node_id = tree.new_with_children(style, &taffy_children)
        .map_err(|e| RenderError::Layout(format!("{e:?}")))?;

    node_map.insert(node_id, NodeInfo {
        tag: node.tag.clone(),
        styles: node.styles.clone(),
        children_info,
    });

    Ok(node_id)
}

fn to_taffy_style(styles: &StyleProperties, _config: &RenderConfig) -> Style {
    let mut ts = Style::default();

    // Display
    ts.display = match styles.display {
        Some(Display::Flex) => taffy::Display::Flex,
        Some(Display::Hidden) => taffy::Display::None,
        _ => taffy::Display::Flex, // Default to flex (like browsers with divs)
    };

    // Flex direction
    ts.flex_direction = match styles.flex_direction {
        Some(FlexDirection::Row) => taffy::FlexDirection::Row,
        Some(FlexDirection::Column) => taffy::FlexDirection::Column,
        None => taffy::FlexDirection::Column, // Default: column (block-like)
    };

    // Align items
    if let Some(ref ai) = styles.align_items {
        ts.align_items = Some(match ai {
            crate::AlignItems::Start => taffy::AlignItems::FlexStart,
            crate::AlignItems::Center => taffy::AlignItems::Center,
            crate::AlignItems::End => taffy::AlignItems::FlexEnd,
            crate::AlignItems::Stretch => taffy::AlignItems::Stretch,
        });
    }

    // Justify content
    if let Some(ref jc) = styles.justify_content {
        ts.justify_content = Some(match jc {
            crate::JustifyContent::Start => taffy::JustifyContent::FlexStart,
            crate::JustifyContent::Center => taffy::JustifyContent::Center,
            crate::JustifyContent::End => taffy::JustifyContent::FlexEnd,
            crate::JustifyContent::SpaceBetween => taffy::JustifyContent::SpaceBetween,
            crate::JustifyContent::SpaceAround => taffy::JustifyContent::SpaceAround,
            crate::JustifyContent::SpaceEvenly => taffy::JustifyContent::SpaceEvenly,
        });
    }

    // Gap
    if let Some(gap) = styles.gap {
        ts.gap = Size {
            width: LengthPercentage::Length(gap),
            height: LengthPercentage::Length(gap),
        };
    }

    // Padding
    ts.padding = Rect {
        top: to_length_percentage(styles.padding_top),
        right: to_length_percentage(styles.padding_right),
        bottom: to_length_percentage(styles.padding_bottom),
        left: to_length_percentage(styles.padding_left),
    };

    // Margin
    ts.margin = Rect {
        top: to_length_percentage_auto(styles.margin_top),
        right: to_length_percentage_auto(styles.margin_right),
        bottom: to_length_percentage_auto(styles.margin_bottom),
        left: to_length_percentage_auto(styles.margin_left),
    };

    // Size
    if let Some(ref w) = styles.width {
        ts.size.width = to_taffy_dimension(w);
    }
    if let Some(ref h) = styles.height {
        ts.size.height = to_taffy_dimension(h);
    }

    // Flex grow/shrink
    if let Some(fg) = styles.flex_grow {
        ts.flex_grow = fg;
    }
    if let Some(fs) = styles.flex_shrink {
        ts.flex_shrink = fs;
    }

    ts
}

fn to_length_percentage(value: Option<f32>) -> LengthPercentage {
    match value {
        Some(v) => LengthPercentage::Length(v),
        None => LengthPercentage::Length(0.0),
    }
}

fn to_length_percentage_auto(value: Option<f32>) -> LengthPercentageAuto {
    match value {
        Some(v) => LengthPercentageAuto::Length(v),
        None => LengthPercentageAuto::Length(0.0),
    }
}

fn to_taffy_dimension(dim: &crate::Dimension) -> taffy::Dimension {
    match dim {
        crate::Dimension::Px(px) => taffy::Dimension::Length(*px),
        crate::Dimension::Percent(pct) => taffy::Dimension::Percent(*pct / 100.0),
        crate::Dimension::Auto => taffy::Dimension::Auto,
    }
}

fn extract_layout(
    tree: &TaffyTree,
    node_map: &HashMap<NodeId, NodeInfo>,
    node_id: NodeId,
    parent_x: f32,
    parent_y: f32,
) -> Result<LayoutNode, RenderError> {
    let layout = tree.layout(node_id)
        .map_err(|e| RenderError::Layout(format!("{e:?}")))?;

    let x = parent_x + layout.location.x;
    let y = parent_y + layout.location.y;

    let info = node_map.get(&node_id)
        .ok_or_else(|| RenderError::Layout("Node not found in map".into()))?;

    let mut children = Vec::new();
    for child_info in &info.children_info {
        match child_info {
            ChildInfo::Node(child_id) => {
                let child_layout = extract_layout(tree, node_map, *child_id, x, y)?;
                children.push(LayoutChild::Node(child_layout));
            }
            ChildInfo::Text(text) => {
                // Text inherits parent position + padding
                let padding_left = info.styles.padding_left.unwrap_or(0.0);
                let padding_top = info.styles.padding_top.unwrap_or(0.0);
                children.push(LayoutChild::Text {
                    content: text.clone(),
                    x: x + padding_left,
                    y: y + padding_top,
                });
            }
        }
    }

    Ok(LayoutNode {
        tag: info.tag.clone(),
        x,
        y,
        width: layout.size.width,
        height: layout.size.height,
        styles: info.styles.clone(),
        children,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ComponentChild;

    fn default_config() -> RenderConfig {
        RenderConfig::default()
    }

    #[test]
    fn layout_simple_div() {
        let node = ComponentNode {
            tag: "div".into(),
            props: HashMap::new(),
            children: vec![ComponentChild::Text("Hello".into())],
            styles: StyleProperties {
                padding_top: Some(16.0),
                padding_right: Some(16.0),
                padding_bottom: Some(16.0),
                padding_left: Some(16.0),
                ..Default::default()
            },
        };

        let layout = compute(&node, &default_config()).unwrap();
        assert_eq!(layout.tag, "div");
        assert!(layout.width > 0.0);
        assert!(layout.height > 0.0);
    }

    #[test]
    fn layout_nested_flex() {
        let child1 = ComponentNode {
            tag: "div".into(),
            props: HashMap::new(),
            children: vec![ComponentChild::Text("A".into())],
            styles: StyleProperties {
                flex_grow: Some(1.0),
                ..Default::default()
            },
        };
        let child2 = ComponentNode {
            tag: "div".into(),
            props: HashMap::new(),
            children: vec![ComponentChild::Text("B".into())],
            styles: StyleProperties {
                flex_grow: Some(1.0),
                ..Default::default()
            },
        };

        let root = ComponentNode {
            tag: "div".into(),
            props: HashMap::new(),
            children: vec![
                ComponentChild::Node(child1),
                ComponentChild::Node(child2),
            ],
            styles: StyleProperties {
                display: Some(Display::Flex),
                flex_direction: Some(FlexDirection::Row),
                ..Default::default()
            },
        };

        let layout = compute(&root, &default_config()).unwrap();
        assert_eq!(layout.children.len(), 2);

        // Both children should share width equally
        if let (LayoutChild::Node(a), LayoutChild::Node(b)) = (&layout.children[0], &layout.children[1]) {
            let diff = (a.width - b.width).abs();
            assert!(diff < 1.0, "Children should have roughly equal width, got {} and {}", a.width, b.width);
        } else {
            panic!("Expected node children");
        }
    }

    #[test]
    fn layout_respects_padding() {
        let node = ComponentNode {
            tag: "div".into(),
            props: HashMap::new(),
            children: vec![ComponentChild::Text("Test".into())],
            styles: StyleProperties {
                padding_top: Some(20.0),
                padding_left: Some(20.0),
                ..Default::default()
            },
        };

        let layout = compute(&node, &default_config()).unwrap();
        // Layout should account for padding
        assert!(layout.height >= 20.0);
    }
}
```

**Step 2: Update layout/mod.rs**

```rust
// pdf-renderer/crates/pdf-renderer-core/src/layout/mod.rs
use crate::{ComponentNode, RenderConfig, RenderError, StyleProperties};

pub mod engine;

/// A node with computed layout positions
#[derive(Debug, Clone)]
pub struct LayoutNode {
    pub tag: String,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub styles: StyleProperties,
    pub children: Vec<LayoutChild>,
}

#[derive(Debug, Clone)]
pub enum LayoutChild {
    Node(LayoutNode),
    Text { content: String, x: f32, y: f32 },
}

pub fn compute_layout(
    tree: &ComponentNode,
    config: &RenderConfig,
) -> Result<LayoutNode, RenderError> {
    engine::compute(tree, config)
}
```

**Step 3: Run tests**

Run: `cd pdf-renderer && cargo test -p pdf-renderer-core layout`

Expected: All layout tests pass

**Step 4: Commit**

```bash
git add pdf-renderer/crates/pdf-renderer-core/src/layout/
git commit -m "feat(pdf-renderer): add Taffy-based Flexbox layout engine"
```

---

## Task 5: PDF Renderer (printpdf)

**Files:**
- Create: `pdf-renderer/crates/pdf-renderer-core/src/renderer/pdf.rs`
- Modify: `pdf-renderer/crates/pdf-renderer-core/src/renderer/mod.rs`

**Step 1: Implement PDF renderer**

```rust
// pdf-renderer/crates/pdf-renderer-core/src/renderer/pdf.rs

use crate::{Color, FontWeight, RenderConfig, RenderError, StyleProperties, TextAlign};
use crate::layout::{LayoutChild, LayoutNode};
use printpdf::*;

/// Render a layout tree to PDF bytes
pub fn render(
    layout: &LayoutNode,
    config: &RenderConfig,
) -> Result<Vec<u8>, RenderError> {
    let (doc, page_idx, layer_idx) = PdfDocument::new(
        "Generated PDF",
        Mm(pt_to_mm(config.page_width)),
        Mm(pt_to_mm(config.page_height)),
        "Layer 1",
    );

    let page = doc.get_page(page_idx);
    let layer = page.get_layer(layer_idx);

    // Load built-in font
    let font = doc.add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|e| RenderError::Render(format!("Font error: {e}")))?;
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold)
        .map_err(|e| RenderError::Render(format!("Font error: {e}")))?;

    let ctx = RenderContext {
        page_height: config.page_height,
        default_font_size: config.default_font_size,
        font: &font,
        font_bold: &font_bold,
    };

    render_node(&layer, &ctx, layout);

    let pdf_bytes = doc.save_to_bytes()
        .map_err(|e| RenderError::Render(format!("PDF save error: {e}")))?;

    Ok(pdf_bytes)
}

struct RenderContext<'a> {
    page_height: f32,
    default_font_size: f32,
    font: &'a IndirectFontRef,
    font_bold: &'a IndirectFontRef,
}

fn render_node(layer: &PdfLayerReference, ctx: &RenderContext, node: &LayoutNode) {
    // Draw background
    if let Some(ref bg) = node.styles.background_color {
        if bg.a > 0.0 {
            draw_rect(
                layer,
                node.x,
                node.y,
                node.width,
                node.height,
                ctx.page_height,
                bg,
                true,
            );
        }
    }

    // Draw border
    if let Some(border_width) = node.styles.border_width {
        if border_width > 0.0 {
            let border_color = node.styles.border_color.as_ref()
                .cloned()
                .unwrap_or(Color { r: 0, g: 0, b: 0, a: 1.0 });
            draw_rect_outline(
                layer,
                node.x,
                node.y,
                node.width,
                node.height,
                ctx.page_height,
                &border_color,
                border_width,
            );
        }
    }

    // Render children
    for child in &node.children {
        match child {
            LayoutChild::Node(child_node) => {
                render_node(layer, ctx, child_node);
            }
            LayoutChild::Text { content, x, y } => {
                let font_size = node.styles.font_size.unwrap_or(ctx.default_font_size);
                let is_bold = matches!(node.styles.font_weight, Some(FontWeight::Bold));
                let font = if is_bold { ctx.font_bold } else { ctx.font };

                let color = node.styles.color.as_ref()
                    .cloned()
                    .unwrap_or(Color { r: 0, g: 0, b: 0, a: 1.0 });

                // PDF Y-axis is bottom-up, so invert
                let pdf_y = ctx.page_height - *y - font_size;

                layer.set_fill_color(printpdf::Color::Rgb(Rgb::new(
                    color.r as f32 / 255.0,
                    color.g as f32 / 255.0,
                    color.b as f32 / 255.0,
                    None,
                )));

                layer.use_text(
                    content.as_str(),
                    Pt(font_size).into(),
                    Mm(pt_to_mm(*x)),
                    Mm(pt_to_mm(pdf_y)),
                    font,
                );
            }
        }
    }
}

fn draw_rect(
    layer: &PdfLayerReference,
    x: f32,
    y: f32,
    width: f32,
    height: f32,
    page_height: f32,
    color: &Color,
    fill: bool,
) {
    let pdf_y = page_height - y - height;

    if fill {
        layer.set_fill_color(printpdf::Color::Rgb(Rgb::new(
            color.r as f32 / 255.0,
            color.g as f32 / 255.0,
            color.b as f32 / 255.0,
            None,
        )));
    }

    let rect = Rect::new(
        Mm(pt_to_mm(x)),
        Mm(pt_to_mm(pdf_y)),
        Mm(pt_to_mm(x + width)),
        Mm(pt_to_mm(pdf_y + height)),
    );

    layer.add_rect(rect);
}

fn draw_rect_outline(
    layer: &PdfLayerReference,
    x: f32,
    y: f32,
    width: f32,
    height: f32,
    page_height: f32,
    color: &Color,
    border_width: f32,
) {
    let pdf_y = page_height - y - height;

    layer.set_outline_color(printpdf::Color::Rgb(Rgb::new(
        color.r as f32 / 255.0,
        color.g as f32 / 255.0,
        color.b as f32 / 255.0,
        None,
    )));
    layer.set_outline_thickness(border_width);

    // Draw border lines
    let points = vec![
        (Point::new(Mm(pt_to_mm(x)), Mm(pt_to_mm(pdf_y))), false),
        (Point::new(Mm(pt_to_mm(x + width)), Mm(pt_to_mm(pdf_y))), false),
        (Point::new(Mm(pt_to_mm(x + width)), Mm(pt_to_mm(pdf_y + height))), false),
        (Point::new(Mm(pt_to_mm(x)), Mm(pt_to_mm(pdf_y + height))), false),
    ];

    let line = Line {
        points,
        is_closed: true,
    };

    layer.add_line(line);
}

/// Convert points to millimeters (1 pt = 0.352778 mm)
fn pt_to_mm(pt: f32) -> f32 {
    pt * 0.352778
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::layout::{LayoutChild, LayoutNode};

    #[test]
    fn render_simple_text() {
        let layout = LayoutNode {
            tag: "div".into(),
            x: 0.0,
            y: 0.0,
            width: 595.0,
            height: 842.0,
            styles: StyleProperties::default(),
            children: vec![LayoutChild::Text {
                content: "Hello World".into(),
                x: 16.0,
                y: 16.0,
            }],
        };

        let config = RenderConfig::default();
        let bytes = render(&layout, &config).unwrap();

        // PDF should start with %PDF header
        assert!(bytes.len() > 100);
        assert_eq!(&bytes[0..5], b"%PDF-");
    }

    #[test]
    fn render_with_background() {
        let layout = LayoutNode {
            tag: "div".into(),
            x: 0.0,
            y: 0.0,
            width: 200.0,
            height: 100.0,
            styles: StyleProperties {
                background_color: Some(Color { r: 59, g: 130, b: 246, a: 1.0 }),
                ..Default::default()
            },
            children: vec![],
        };

        let config = RenderConfig::default();
        let bytes = render(&layout, &config).unwrap();
        assert!(bytes.len() > 100);
    }

    #[test]
    fn render_nested_layout() {
        let child = LayoutNode {
            tag: "p".into(),
            x: 16.0,
            y: 16.0,
            width: 200.0,
            height: 24.0,
            styles: StyleProperties {
                font_size: Some(16.0),
                ..Default::default()
            },
            children: vec![LayoutChild::Text {
                content: "Paragraph text".into(),
                x: 16.0,
                y: 16.0,
            }],
        };

        let layout = LayoutNode {
            tag: "div".into(),
            x: 0.0,
            y: 0.0,
            width: 595.0,
            height: 842.0,
            styles: StyleProperties {
                padding_top: Some(16.0),
                padding_left: Some(16.0),
                ..Default::default()
            },
            children: vec![LayoutChild::Node(child)],
        };

        let config = RenderConfig::default();
        let bytes = render(&layout, &config).unwrap();
        assert!(bytes.len() > 100);
    }
}
```

**Step 2: Update renderer/mod.rs**

```rust
// pdf-renderer/crates/pdf-renderer-core/src/renderer/mod.rs
use crate::{RenderConfig, RenderError};
use crate::layout::LayoutNode;

pub mod pdf;
pub mod svg;

pub fn render_pdf(
    layout: &LayoutNode,
    config: &RenderConfig,
) -> Result<Vec<u8>, RenderError> {
    pdf::render(layout, config)
}
```

**Step 3: Write SVG stub**

```rust
// pdf-renderer/crates/pdf-renderer-core/src/renderer/svg.rs

// SVG support will be added in Task 6.
// For now, SVG elements are rendered as empty rectangles.
```

**Step 4: Run tests**

Run: `cd pdf-renderer && cargo test -p pdf-renderer-core renderer`

Expected: All renderer tests pass

**Step 5: Commit**

```bash
git add pdf-renderer/crates/pdf-renderer-core/src/renderer/
git commit -m "feat(pdf-renderer): add PDF renderer using printpdf"
```

---

## Task 6: SVG Support

**Files:**
- Modify: `pdf-renderer/crates/pdf-renderer-core/src/renderer/svg.rs`

**Step 1: Implement SVG to PDF conversion**

```rust
// pdf-renderer/crates/pdf-renderer-core/src/renderer/svg.rs

use crate::RenderError;

/// Render SVG content to PNG bytes (for embedding in PDF)
pub fn render_svg_to_png(svg_data: &str, width: u32, height: u32) -> Result<Vec<u8>, RenderError> {
    let options = usvg::Options::default();
    let tree = usvg::Tree::from_str(svg_data, &options)
        .map_err(|e| RenderError::Render(format!("SVG parse error: {e}")))?;

    let size = tree.size();
    let scale_x = width as f32 / size.width();
    let scale_y = height as f32 / size.height();
    let scale = scale_x.min(scale_y);

    let pixmap_size = resvg::tiny_skia::IntSize::from_wh(width, height)
        .ok_or_else(|| RenderError::Render("Invalid SVG dimensions".into()))?;

    let mut pixmap = resvg::tiny_skia::Pixmap::new(pixmap_size.width(), pixmap_size.height())
        .ok_or_else(|| RenderError::Render("Failed to create pixmap".into()))?;

    let transform = resvg::tiny_skia::Transform::from_scale(scale, scale);
    resvg::render(&tree, transform, &mut pixmap.as_mut());

    pixmap.encode_png()
        .map_err(|e| RenderError::Render(format!("PNG encode error: {e}")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn render_simple_svg() {
        let svg = r#"<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
            <rect width="100" height="100" fill="red"/>
        </svg>"#;

        let png = render_svg_to_png(svg, 100, 100).unwrap();
        // PNG header: 0x89 P N G
        assert_eq!(&png[0..4], &[0x89, 0x50, 0x4E, 0x47]);
    }

    #[test]
    fn render_svg_with_circle() {
        let svg = r#"<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
            <circle cx="100" cy="100" r="50" fill="blue"/>
        </svg>"#;

        let png = render_svg_to_png(svg, 200, 200).unwrap();
        assert!(png.len() > 100);
    }

    #[test]
    fn invalid_svg_returns_error() {
        let result = render_svg_to_png("not valid svg", 100, 100);
        assert!(result.is_err());
    }
}
```

**Step 2: Run tests**

Run: `cd pdf-renderer && cargo test -p pdf-renderer-core renderer::svg`

Expected: All SVG tests pass

**Step 3: Commit**

```bash
git add pdf-renderer/crates/pdf-renderer-core/src/renderer/svg.rs
git commit -m "feat(pdf-renderer): add SVG to PNG conversion using resvg"
```

---

## Task 7: End-to-End Integration Test + WASM Build

**Files:**
- Modify: `pdf-renderer/crates/pdf-renderer-core/src/lib.rs` (add integration tests)
- Create: `pdf-renderer/build-wasm.sh`

**Step 1: Write end-to-end integration test in Rust**

Add to `lib.rs`:

```rust
#[cfg(test)]
mod integration_tests {
    use super::*;

    #[test]
    fn render_jsx_to_pdf() {
        let jsx = r#"<div className="p-4 bg-white">
            <h1 className="text-2xl font-bold text-gray-900">Invoice #001</h1>
            <p className="text-base text-gray-600">Thank you for your purchase.</p>
        </div>"#;

        let config = RenderConfig::default();
        let pdf_bytes = render_to_pdf(jsx, &config).unwrap();

        assert!(pdf_bytes.len() > 100, "PDF should have content");
        assert_eq!(&pdf_bytes[0..5], b"%PDF-", "Should be valid PDF");
    }

    #[test]
    fn render_flexbox_layout() {
        let jsx = r#"<div className="flex flex-row gap-4 p-8">
            <div className="flex-1 p-4 bg-gray-100 rounded-lg">
                <p className="text-lg font-bold">Column A</p>
            </div>
            <div className="flex-1 p-4 bg-gray-100 rounded-lg">
                <p className="text-lg font-bold">Column B</p>
            </div>
        </div>"#;

        let config = RenderConfig::default();
        let pdf_bytes = render_to_pdf(jsx, &config).unwrap();
        assert!(pdf_bytes.len() > 100);
    }

    #[test]
    fn render_card_component() {
        let jsx = r#"<div className="p-6 bg-white border rounded-xl">
            <h2 className="text-xl font-bold text-gray-900">Card Title</h2>
            <p className="text-sm text-gray-500">Card description goes here.</p>
            <div className="flex flex-row justify-between items-center mt-4">
                <span className="text-sm text-blue-600">View details</span>
                <span className="text-sm text-gray-400">2 min ago</span>
            </div>
        </div>"#;

        let config = RenderConfig::default();
        let pdf_bytes = render_to_pdf(jsx, &config).unwrap();
        assert!(pdf_bytes.len() > 100);
    }

    #[test]
    fn custom_page_size() {
        let jsx = r#"<div className="p-4"><p>Letter size</p></div>"#;
        let config = RenderConfig {
            page_width: 612.0,  // US Letter
            page_height: 792.0,
            default_font_size: 12.0,
        };
        let pdf_bytes = render_to_pdf(jsx, &config).unwrap();
        assert!(pdf_bytes.len() > 100);
    }
}
```

**Step 2: Run integration tests**

Run: `cd pdf-renderer && cargo test -p pdf-renderer-core integration_tests`

Expected: All pass

**Step 3: Write WASM build script**

```bash
#!/usr/bin/env bash
# pdf-renderer/build-wasm.sh
set -euo pipefail

echo "Building WASM..."
cd "$(dirname "$0")"

# Build with wasm-pack
wasm-pack build crates/pdf-renderer-wasm \
    --target web \
    --out-dir ../../libraries/pdf-renderer/wasm \
    --out-name pdf_renderer

echo "WASM build complete. Output: libraries/pdf-renderer/wasm/"
```

```bash
chmod +x pdf-renderer/build-wasm.sh
```

**Step 4: Run WASM build (verify it compiles)**

Run: `cd pdf-renderer && ./build-wasm.sh`

Expected: WASM output in `libraries/pdf-renderer/wasm/`

> **Note:** Requires `wasm-pack` installed. Install with: `cargo install wasm-pack`

**Step 5: Commit**

```bash
git add pdf-renderer/crates/pdf-renderer-core/src/lib.rs pdf-renderer/build-wasm.sh
git commit -m "feat(pdf-renderer): add integration tests and WASM build script"
```

---

## Task 8: Scaffold JS Library

**Files:**
- Create: `libraries/pdf-renderer/fot.config.ts`
- Create: `libraries/pdf-renderer/package.json`
- Create: `libraries/pdf-renderer/.npmignore`
- Create: `libraries/pdf-renderer/src/types.ts`

**Step 1: Create directory structure**

```bash
mkdir -p libraries/pdf-renderer/src/{core,plugins/{react,vue,svelte}}
mkdir -p libraries/pdf-renderer/__tests__/plugins
mkdir -p libraries/pdf-renderer/wasm
```

**Step 2: Write fot.config.ts**

```typescript
// libraries/pdf-renderer/fot.config.ts
import { defineFotConfig } from "@f-o-t/config";

export default defineFotConfig({
  external: ["zod", "react", "vue", "svelte"],
  plugins: ["react", "vue", "svelte"],
});
```

**Step 3: Write package.json**

```json
{
  "name": "@f-o-t/pdf-renderer",
  "version": "1.0.0",
  "type": "module",
  "files": ["dist", "wasm"],
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./plugins/react": {
      "types": "./dist/plugins/react/index.d.ts",
      "default": "./dist/plugins/react/index.js"
    },
    "./plugins/vue": {
      "types": "./dist/plugins/vue/index.d.ts",
      "default": "./dist/plugins/vue/index.js"
    },
    "./plugins/svelte": {
      "types": "./dist/plugins/svelte/index.d.ts",
      "default": "./dist/plugins/svelte/index.js"
    }
  },
  "scripts": {
    "build": "bun x --bun fot build",
    "build:wasm": "../pdf-renderer/build-wasm.sh",
    "test": "bun x --bun fot test",
    "lint": "bun x --bun fot lint",
    "format": "bun x --bun fot format",
    "check": "bun x --bun fot check"
  },
  "dependencies": {
    "zod": "^4.3.6"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "vue": "^3.0.0",
    "svelte": "^4.0.0 || ^5.0.0"
  },
  "peerDependenciesMeta": {
    "react": { "optional": true },
    "vue": { "optional": true },
    "svelte": { "optional": true }
  },
  "devDependencies": {
    "@f-o-t/cli": "^1.0.1",
    "@f-o-t/config": "^1.0.3",
    "@types/bun": "latest"
  }
}
```

**Step 4: Write .npmignore**

```
src/
__tests__/
fot.config.ts
tsconfig.json
biome.json
*.test.ts
```

**Step 5: Write types.ts**

```typescript
// libraries/pdf-renderer/src/types.ts
import { z } from "zod";

export const RenderConfigSchema = z.object({
  pageWidth: z.number().positive().default(595),
  pageHeight: z.number().positive().default(842),
  defaultFontSize: z.number().positive().default(12),
});

export type RenderConfig = z.infer<typeof RenderConfigSchema>;

export type PDFRendererInstance = {
  renderToPDF(jsxSource: string, config?: Partial<RenderConfig>): Promise<Uint8Array>;
  registerComponent(name: string, source: string): void;
  isReady(): boolean;
};
```

**Step 6: Commit**

```bash
git add libraries/pdf-renderer/
git commit -m "chore(pdf-renderer): scaffold JS library with types and config"
```

---

## Task 9: PDFRenderer Core Wrapper

**Files:**
- Create: `libraries/pdf-renderer/src/core/renderer.ts`
- Test: `libraries/pdf-renderer/__tests__/renderer.test.ts`

**Step 1: Write failing tests**

```typescript
// libraries/pdf-renderer/__tests__/renderer.test.ts
import { describe, expect, test, beforeAll } from "bun:test";
import { createPDFRenderer } from "../src/core/renderer";

describe("createPDFRenderer()", () => {
  test("creates renderer instance", async () => {
    const renderer = await createPDFRenderer();
    expect(renderer).toBeDefined();
    expect(typeof renderer.renderToPDF).toBe("function");
    expect(typeof renderer.registerComponent).toBe("function");
    expect(renderer.isReady()).toBe(true);
  });

  test("registerComponent stores component source", async () => {
    const renderer = await createPDFRenderer();
    renderer.registerComponent("Card", '<div className="p-4 border rounded">Card</div>');
    // Should not throw
  });

  test("renderToPDF returns Uint8Array", async () => {
    const renderer = await createPDFRenderer();
    const pdf = await renderer.renderToPDF('<div className="p-4">Hello</div>');
    expect(pdf).toBeInstanceOf(Uint8Array);
    expect(pdf.length).toBeGreaterThan(0);
    // Check PDF magic bytes
    expect(pdf[0]).toBe(0x25); // %
    expect(pdf[1]).toBe(0x50); // P
    expect(pdf[2]).toBe(0x44); // D
    expect(pdf[3]).toBe(0x46); // F
  });

  test("renderToPDF with custom config", async () => {
    const renderer = await createPDFRenderer();
    const pdf = await renderer.renderToPDF(
      '<div className="p-4">Letter size</div>',
      { pageWidth: 612, pageHeight: 792 },
    );
    expect(pdf).toBeInstanceOf(Uint8Array);
    expect(pdf.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Implement PDFRenderer wrapper**

```typescript
// libraries/pdf-renderer/src/core/renderer.ts
import { RenderConfigSchema, type PDFRendererInstance, type RenderConfig } from "../types";

// WASM module type (generated by wasm-pack)
type WasmModule = {
  default: () => Promise<void>;
  render_to_pdf: (jsx: string, config: string) => Uint8Array;
};

export async function createPDFRenderer(
  wasmPath?: string,
): Promise<PDFRendererInstance> {
  const components = new Map<string, string>();
  let wasmModule: WasmModule | null = null;
  let ready = false;

  // Try to load WASM module
  try {
    const modulePath = wasmPath ?? new URL("../../wasm/pdf_renderer.js", import.meta.url).href;
    wasmModule = await import(modulePath);
    if (wasmModule?.default) {
      await wasmModule.default();
    }
    ready = true;
  } catch {
    // WASM not available — will throw on render
    ready = false;
  }

  return {
    renderToPDF(jsxSource: string, config?: Partial<RenderConfig>): Promise<Uint8Array> {
      if (!wasmModule || !ready) {
        throw new Error(
          "WASM module not loaded. Ensure pdf_renderer.wasm is available.",
        );
      }

      const resolvedConfig = RenderConfigSchema.parse(config ?? {});
      const configJson = JSON.stringify({
        page_width: resolvedConfig.pageWidth,
        page_height: resolvedConfig.pageHeight,
        default_font_size: resolvedConfig.defaultFontSize,
      });

      // Resolve component references in JSX
      let resolvedJsx = jsxSource;
      for (const [name, source] of components) {
        resolvedJsx = resolvedJsx.replace(
          new RegExp(`<${name}\\s*/>`, "g"),
          source,
        );
      }

      const bytes = wasmModule.render_to_pdf(resolvedJsx, configJson);
      return Promise.resolve(new Uint8Array(bytes));
    },

    registerComponent(name: string, source: string): void {
      components.set(name, source);
    },

    isReady(): boolean {
      return ready;
    },
  };
}
```

> **Note:** Tests in Step 1 require the WASM module to be built first. Run `cd pdf-renderer && ./build-wasm.sh` before running JS tests.

**Step 3: Run tests**

Run: `cd libraries/pdf-renderer && bun test __tests__/renderer.test.ts`

Expected: All pass (assuming WASM is built)

**Step 4: Commit**

```bash
git add libraries/pdf-renderer/src/core/renderer.ts libraries/pdf-renderer/__tests__/renderer.test.ts
git commit -m "feat(pdf-renderer): add PDFRenderer WASM wrapper"
```

---

## Task 10: React Plugin

**Files:**
- Create: `libraries/pdf-renderer/src/plugins/react/index.ts`
- Create: `libraries/pdf-renderer/src/plugins/react/serializer.ts`
- Test: `libraries/pdf-renderer/__tests__/plugins/react.test.ts`

**Step 1: Implement React element serializer**

```typescript
// libraries/pdf-renderer/src/plugins/react/serializer.ts

type ReactElement = {
  type: string | Function;
  props: Record<string, unknown> & { children?: unknown };
};

/**
 * Serialize a React element tree to a JSX string for the WASM renderer.
 * Recursively walks the React element tree and produces valid JSX.
 */
export function serializeToJSX(element: unknown): string {
  if (element === null || element === undefined) return "";
  if (typeof element === "string") return escapeJSXText(element);
  if (typeof element === "number") return String(element);
  if (typeof element === "boolean") return "";
  if (Array.isArray(element)) return element.map(serializeToJSX).join("");

  const el = element as ReactElement;

  // Function components: call them to get their rendered output
  if (typeof el.type === "function") {
    try {
      const rendered = el.type(el.props);
      return serializeToJSX(rendered);
    } catch {
      return `<!-- Error rendering ${el.type.name ?? "component"} -->`;
    }
  }

  // String tags: serialize to JSX
  if (typeof el.type === "string") {
    const tag = el.type;
    const { children, ...restProps } = el.props ?? {};
    const propsStr = serializeProps(restProps);
    const childrenStr = serializeChildren(children);

    if (childrenStr) {
      return `<${tag}${propsStr}>${childrenStr}</${tag}>`;
    }
    return `<${tag}${propsStr} />`;
  }

  return "";
}

function serializeProps(props: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (value === true) {
      parts.push(` ${key}`);
      continue;
    }
    if (typeof value === "string") {
      parts.push(` ${key}="${escapeAttr(value)}"`);
    } else if (typeof value === "number") {
      parts.push(` ${key}={${value}}`);
    }
    // Skip objects, functions, etc.
  }
  return parts.join("");
}

function serializeChildren(children: unknown): string {
  if (children === null || children === undefined) return "";
  if (Array.isArray(children)) return children.map(serializeToJSX).join("");
  return serializeToJSX(children);
}

function escapeJSXText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
```

**Step 2: Implement React plugin (usePDF hook)**

```typescript
// libraries/pdf-renderer/src/plugins/react/index.ts
import type { PDFRendererInstance, RenderConfig } from "../../types";
import { createPDFRenderer } from "../../core/renderer";
import { serializeToJSX } from "./serializer";

export { serializeToJSX } from "./serializer";

/**
 * React hook for PDF generation.
 *
 * Usage:
 * ```tsx
 * import { usePDF } from '@f-o-t/pdf-renderer/plugins/react';
 *
 * function MyComponent() {
 *   const { generatePDF, ready } = usePDF();
 *
 *   const handleExport = async () => {
 *     const pdf = await generatePDF(<InvoiceTemplate data={data} />);
 *     // download or upload pdf bytes
 *   };
 * }
 * ```
 */
export function usePDF(config?: Partial<RenderConfig>) {
  // This is a framework-agnostic factory — actual React hook (useState/useEffect)
  // would be added when React is available. This provides the core logic.
  let renderer: PDFRendererInstance | null = null;
  let initPromise: Promise<void> | null = null;

  async function ensureRenderer(): Promise<PDFRendererInstance> {
    if (renderer) return renderer;
    if (!initPromise) {
      initPromise = createPDFRenderer().then((r) => {
        renderer = r;
      });
    }
    await initPromise;
    return renderer!;
  }

  return {
    async generatePDF(element: unknown): Promise<Uint8Array> {
      const r = await ensureRenderer();
      const jsx = serializeToJSX(element);
      return r.renderToPDF(jsx, config);
    },

    get ready(): boolean {
      return renderer?.isReady() ?? false;
    },
  };
}

/**
 * Standalone function: render a React element to PDF bytes.
 */
export async function renderToPDF(
  element: unknown,
  config?: Partial<RenderConfig>,
): Promise<Uint8Array> {
  const renderer = await createPDFRenderer();
  const jsx = serializeToJSX(element);
  return renderer.renderToPDF(jsx, config);
}
```

**Step 3: Write tests for serializer**

```typescript
// libraries/pdf-renderer/__tests__/plugins/react.test.ts
import { describe, expect, test } from "bun:test";
import { serializeToJSX } from "../../src/plugins/react/serializer";

describe("serializeToJSX()", () => {
  test("serializes string children", () => {
    const element = {
      type: "div",
      props: { className: "p-4", children: "Hello World" },
    };
    const jsx = serializeToJSX(element);
    expect(jsx).toBe('<div className="p-4">Hello World</div>');
  });

  test("serializes nested elements", () => {
    const element = {
      type: "div",
      props: {
        className: "container",
        children: {
          type: "p",
          props: { children: "Paragraph" },
        },
      },
    };
    const jsx = serializeToJSX(element);
    expect(jsx).toBe('<div className="container"><p>Paragraph</p></div>');
  });

  test("serializes array children", () => {
    const element = {
      type: "ul",
      props: {
        children: [
          { type: "li", props: { children: "Item 1" } },
          { type: "li", props: { children: "Item 2" } },
        ],
      },
    };
    const jsx = serializeToJSX(element);
    expect(jsx).toBe("<ul><li>Item 1</li><li>Item 2</li></ul>");
  });

  test("serializes self-closing tags", () => {
    const element = {
      type: "img",
      props: { src: "photo.jpg" },
    };
    const jsx = serializeToJSX(element);
    expect(jsx).toBe('<img src="photo.jpg" />');
  });

  test("handles boolean props", () => {
    const element = {
      type: "input",
      props: { disabled: true, hidden: false },
    };
    const jsx = serializeToJSX(element);
    expect(jsx).toBe("<input disabled />");
  });

  test("handles null and undefined", () => {
    expect(serializeToJSX(null)).toBe("");
    expect(serializeToJSX(undefined)).toBe("");
  });

  test("handles function components", () => {
    function MyComponent(props: { name: string }) {
      return { type: "div", props: { children: `Hello ${props.name}` } };
    }
    const element = {
      type: MyComponent,
      props: { name: "World" },
    };
    const jsx = serializeToJSX(element);
    expect(jsx).toBe("<div>Hello World</div>");
  });

  test("escapes special characters in text", () => {
    const element = {
      type: "p",
      props: { children: "a < b & c > d" },
    };
    const jsx = serializeToJSX(element);
    expect(jsx).toContain("&lt;");
    expect(jsx).toContain("&amp;");
    expect(jsx).toContain("&gt;");
  });

  test("escapes special characters in attributes", () => {
    const element = {
      type: "div",
      props: { title: 'He said "hello"', children: null },
    };
    const jsx = serializeToJSX(element);
    expect(jsx).toContain("&quot;");
  });
});
```

**Step 4: Run tests**

Run: `cd libraries/pdf-renderer && bun test __tests__/plugins/react.test.ts`

Expected: All serializer tests pass

**Step 5: Commit**

```bash
git add libraries/pdf-renderer/src/plugins/react/ libraries/pdf-renderer/__tests__/plugins/react.test.ts
git commit -m "feat(pdf-renderer): add React plugin with JSX serializer and usePDF"
```

---

## Task 11: Vue Plugin

**Files:**
- Create: `libraries/pdf-renderer/src/plugins/vue/index.ts`
- Test: `libraries/pdf-renderer/__tests__/plugins/vue.test.ts`

**Step 1: Implement Vue plugin**

```typescript
// libraries/pdf-renderer/src/plugins/vue/index.ts
import type { PDFRendererInstance, RenderConfig } from "../../types";
import { createPDFRenderer } from "../../core/renderer";

type VNode = {
  type: string | object;
  props: Record<string, unknown> | null;
  children: VNode[] | string | null;
};

/**
 * Serialize a Vue VNode tree to JSX string
 */
export function serializeVNodeToJSX(vnode: unknown): string {
  if (vnode === null || vnode === undefined) return "";
  if (typeof vnode === "string") return vnode;
  if (typeof vnode === "number") return String(vnode);
  if (Array.isArray(vnode)) return vnode.map(serializeVNodeToJSX).join("");

  const node = vnode as VNode;
  if (typeof node.type !== "string") return "";

  const tag = node.type;
  const props = node.props ?? {};
  const { class: className, ...rest } = props;

  let propsStr = "";
  if (className) {
    propsStr += ` className="${String(className)}"`;
  }
  for (const [key, value] of Object.entries(rest)) {
    if (typeof value === "string") {
      propsStr += ` ${key}="${value}"`;
    } else if (typeof value === "number") {
      propsStr += ` ${key}={${value}}`;
    } else if (value === true) {
      propsStr += ` ${key}`;
    }
  }

  const children = node.children;
  if (children === null || children === undefined) {
    return `<${tag}${propsStr} />`;
  }
  if (typeof children === "string") {
    return `<${tag}${propsStr}>${children}</${tag}>`;
  }
  if (Array.isArray(children)) {
    const inner = children.map(serializeVNodeToJSX).join("");
    return `<${tag}${propsStr}>${inner}</${tag}>`;
  }
  return `<${tag}${propsStr} />`;
}

/**
 * Vue composable for PDF generation.
 *
 * Usage:
 * ```vue
 * <script setup>
 * import { usePDF } from '@f-o-t/pdf-renderer/plugins/vue';
 *
 * const { generatePDF, ready } = usePDF();
 * </script>
 * ```
 */
export function usePDF(config?: Partial<RenderConfig>) {
  let renderer: PDFRendererInstance | null = null;
  let initPromise: Promise<void> | null = null;

  async function ensureRenderer(): Promise<PDFRendererInstance> {
    if (renderer) return renderer;
    if (!initPromise) {
      initPromise = createPDFRenderer().then((r) => {
        renderer = r;
      });
    }
    await initPromise;
    return renderer!;
  }

  return {
    async generatePDF(vnode: unknown): Promise<Uint8Array> {
      const r = await ensureRenderer();
      const jsx = serializeVNodeToJSX(vnode);
      return r.renderToPDF(jsx, config);
    },

    get ready(): boolean {
      return renderer?.isReady() ?? false;
    },
  };
}
```

**Step 2: Write tests**

```typescript
// libraries/pdf-renderer/__tests__/plugins/vue.test.ts
import { describe, expect, test } from "bun:test";
import { serializeVNodeToJSX } from "../../src/plugins/vue/index";

describe("serializeVNodeToJSX()", () => {
  test("serializes simple VNode", () => {
    const vnode = {
      type: "div",
      props: { class: "p-4" },
      children: "Hello",
    };
    const jsx = serializeVNodeToJSX(vnode);
    expect(jsx).toBe('<div className="p-4">Hello</div>');
  });

  test("serializes nested VNodes", () => {
    const vnode = {
      type: "div",
      props: { class: "container" },
      children: [
        { type: "p", props: null, children: "Text" },
      ],
    };
    const jsx = serializeVNodeToJSX(vnode);
    expect(jsx).toBe('<div className="container"><p>Text</p></div>');
  });

  test("serializes self-closing elements", () => {
    const vnode = { type: "img", props: { src: "photo.jpg" }, children: null };
    const jsx = serializeVNodeToJSX(vnode);
    expect(jsx).toBe('<img src="photo.jpg" />');
  });

  test("maps Vue class prop to className", () => {
    const vnode = { type: "div", props: { class: "flex gap-4" }, children: null };
    const jsx = serializeVNodeToJSX(vnode);
    expect(jsx).toContain('className="flex gap-4"');
    expect(jsx).not.toContain('class=');
  });

  test("handles null input", () => {
    expect(serializeVNodeToJSX(null)).toBe("");
  });
});
```

**Step 3: Run tests**

Run: `cd libraries/pdf-renderer && bun test __tests__/plugins/vue.test.ts`

Expected: All pass

**Step 4: Commit**

```bash
git add libraries/pdf-renderer/src/plugins/vue/ libraries/pdf-renderer/__tests__/plugins/vue.test.ts
git commit -m "feat(pdf-renderer): add Vue plugin with VNode serializer and usePDF"
```

---

## Task 12: Svelte Plugin

**Files:**
- Create: `libraries/pdf-renderer/src/plugins/svelte/index.ts`

**Step 1: Implement Svelte plugin**

```typescript
// libraries/pdf-renderer/src/plugins/svelte/index.ts
import type { PDFRendererInstance, RenderConfig } from "../../types";
import { createPDFRenderer } from "../../core/renderer";

/**
 * Create a PDF renderer for Svelte.
 *
 * Usage:
 * ```svelte
 * <script>
 * import { createPDFRenderer } from '@f-o-t/pdf-renderer/plugins/svelte';
 *
 * const { render, ready } = createSveltePDFRenderer();
 *
 * async function exportPDF() {
 *   const pdf = await render('<div className="p-4">Hello</div>');
 *   // download pdf bytes
 * }
 * </script>
 * ```
 *
 * Svelte components should be pre-rendered to HTML/JSX strings before
 * passing to the renderer. Use SSR utilities or manual serialization.
 */
export function createSveltePDFRenderer(config?: Partial<RenderConfig>) {
  let renderer: PDFRendererInstance | null = null;
  let initPromise: Promise<void> | null = null;

  async function ensureRenderer(): Promise<PDFRendererInstance> {
    if (renderer) return renderer;
    if (!initPromise) {
      initPromise = createPDFRenderer().then((r) => {
        renderer = r;
      });
    }
    await initPromise;
    return renderer!;
  }

  return {
    async render(jsxSource: string): Promise<Uint8Array> {
      const r = await ensureRenderer();
      return r.renderToPDF(jsxSource, config);
    },

    get ready(): boolean {
      return renderer?.isReady() ?? false;
    },
  };
}
```

**Step 2: Commit**

```bash
git add libraries/pdf-renderer/src/plugins/svelte/
git commit -m "feat(pdf-renderer): add Svelte plugin with createSveltePDFRenderer"
```

---

## Task 13: Index + Documentation + Release

**Files:**
- Create: `libraries/pdf-renderer/src/index.ts`
- Create: `libraries/pdf-renderer/README.md`
- Create: `libraries/pdf-renderer/CHANGELOG.md`

**Step 1: Write index.ts**

```typescript
// libraries/pdf-renderer/src/index.ts
export type { PDFRendererInstance, RenderConfig } from "./types";
export { RenderConfigSchema } from "./types";
export { createPDFRenderer } from "./core/renderer";
```

**Step 2: Write README.md**

```markdown
# @f-o-t/pdf-renderer

Takumi-style PDF renderer: parse JSX + Tailwind CSS in Rust (WASM), render to PDF.

## Installation

```bash
npm install @f-o-t/pdf-renderer
```

## Usage

### Core API (framework-agnostic)

```typescript
import { createPDFRenderer } from "@f-o-t/pdf-renderer";

const renderer = await createPDFRenderer();

const pdf = await renderer.renderToPDF(`
  <div className="p-8 bg-white">
    <h1 className="text-2xl font-bold text-gray-900">Invoice #001</h1>
    <p className="text-base text-gray-600">Thank you for your purchase.</p>
  </div>
`);

// pdf is Uint8Array — save to file, download, or upload
```

### React Plugin

```tsx
import { usePDF, renderToPDF } from "@f-o-t/pdf-renderer/plugins/react";

// Hook
function InvoicePage() {
  const { generatePDF, ready } = usePDF();

  const handleExport = async () => {
    const pdf = await generatePDF(
      <div className="p-8 bg-white">
        <h1 className="text-2xl font-bold">Invoice</h1>
      </div>
    );
    download(pdf, "invoice.pdf");
  };

  return <button onClick={handleExport} disabled={!ready}>Export PDF</button>;
}

// Standalone
const pdf = await renderToPDF(<MyComponent data={data} />);
```

### Vue Plugin

```vue
<script setup>
import { usePDF } from "@f-o-t/pdf-renderer/plugins/vue";

const { generatePDF, ready } = usePDF();

async function exportPDF() {
  const vnode = h("div", { class: "p-8" }, [
    h("h1", { class: "text-2xl font-bold" }, "Invoice"),
  ]);
  const pdf = await generatePDF(vnode);
}
</script>
```

### Svelte Plugin

```svelte
<script>
import { createSveltePDFRenderer } from "@f-o-t/pdf-renderer/plugins/svelte";

const { render, ready } = createSveltePDFRenderer();

async function exportPDF() {
  const pdf = await render('<div className="p-8"><h1 className="text-2xl font-bold">Invoice</h1></div>');
}
</script>
```

## Supported Elements

`div`, `span`, `p`, `h1`-`h6`, `img`, `svg`, `table`, `tr`, `td`, `th`, `ul`, `ol`, `li`

## Supported Tailwind Classes

- **Spacing:** `p-*`, `px-*`, `py-*`, `pt-*`, `m-*`, `mx-*`, `my-*`, `gap-*`
- **Sizing:** `w-*`, `h-*`, `w-full`, `w-1/2`
- **Colors:** `text-gray-900`, `bg-white`, `text-blue-600`, etc.
- **Borders:** `border`, `border-*`, `rounded`, `rounded-lg`
- **Flexbox:** `flex`, `flex-row`, `flex-col`, `items-center`, `justify-between`
- **Typography:** `text-sm`, `text-base`, `text-lg`, `text-2xl`, `font-bold`
- **Display:** `block`, `inline`, `flex`, `hidden`

## Configuration

```typescript
const renderer = await createPDFRenderer();

// Custom page size (US Letter)
const pdf = await renderer.renderToPDF(jsx, {
  pageWidth: 612,
  pageHeight: 792,
  defaultFontSize: 11,
});
```

## Architecture

- **Rust core:** Parses JSX (SWC), resolves Tailwind → CSS, computes Flexbox layout (Taffy), renders PDF (printpdf)
- **WASM:** Core compiled to WebAssembly for browser + server use
- **JS wrapper:** TypeScript API wrapping WASM module
- **Framework plugins:** Serialize framework-specific trees to JSX strings
```

**Step 3: Write CHANGELOG.md**

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - YYYY-MM-DD

### Added
- Rust core with JSX parser (SWC), Tailwind CSS parser, Flexbox layout (Taffy), PDF renderer (printpdf)
- SVG to PNG conversion (resvg)
- WASM build and JS wrapper
- `createPDFRenderer()` factory function
- React plugin with `usePDF()` hook, `renderToPDF()`, and `serializeToJSX()`
- Vue plugin with `usePDF()` composable and `serializeVNodeToJSX()`
- Svelte plugin with `createSveltePDFRenderer()`
- Support for common HTML elements (div, span, p, h1-h6, img, svg, table, lists)
- Support for common Tailwind CSS classes (spacing, sizing, colors, borders, flexbox, typography)
- Custom page size configuration (A4, Letter, etc.)

[1.0.0]: https://github.com/F-O-T/libraries/releases/tag/@f-o-t/pdf-renderer@1.0.0
```

**Step 4: Build and run all tests**

Run:
```bash
cd pdf-renderer && cargo test
cd ../libraries/pdf-renderer && bun x --bun fot build && bun test
```

**Step 5: Commit**

```bash
git add libraries/pdf-renderer/
git commit -m "feat(pdf-renderer): complete @f-o-t/pdf-renderer v1.0.0

Rust+WASM PDF renderer with JSX/Tailwind parsing, Flexbox layout, and
framework plugins for React, Vue, and Svelte."
```
