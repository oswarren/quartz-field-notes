#!/usr/bin/env node
/*
  apply-theme.mjs: install a theme into a Quartz 5 site.

  Run it FROM YOUR QUARTZ FOLDER (the one with quartz.config.yaml):

    node path/to/apply-theme.mjs field-notes
    node path/to/apply-theme.mjs field-notes --palette slate
    node path/to/apply-theme.mjs --list
    node path/to/apply-theme.mjs --restore

  What it touches, and nothing else:
    quartz/styles/custom.scss              (replaced with the theme's stylesheet)
    quartz.config.yaml > configuration.theme.typography
    quartz.config.yaml > configuration.theme.colors

  The first run snapshots both files into .quartz-themes-backup/.
  Every later run re-applies on top of that snapshot, so switching
  themes never stacks. --restore puts the snapshot back and removes it.

  No dependencies beyond the `yaml` package Quartz 5 already installs.
*/

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { createRequire } from "node:module"

const here = path.dirname(fileURLToPath(import.meta.url))
const themesDir = path.join(here, "themes")
const root = process.cwd()
const configPath = path.join(root, "quartz.config.yaml")
const scssPath = path.join(root, "quartz", "styles", "custom.scss")
const backupDir = path.join(root, ".quartz-themes-backup")
const backupConfig = path.join(backupDir, "quartz.config.yaml")
const backupScss = path.join(backupDir, "custom.scss")

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const opt = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}

function die(msg) {
  console.error(`\n  ${msg}\n`)
  process.exit(1)
}

function listThemes() {
  return fs
    .readdirSync(themesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(themesDir, d.name, "theme.json")))
    .map((d) => JSON.parse(fs.readFileSync(path.join(themesDir, d.name, "theme.json"), "utf8")))
}

function assertQuartzRoot() {
  if (!fs.existsSync(configPath) || !fs.existsSync(path.dirname(scssPath))) {
    die(
      `This does not look like a Quartz 5 folder.\n  Expected ${configPath}\n  and ${path.dirname(scssPath)}\n  Run this command from the folder that contains quartz.config.yaml.`,
    )
  }
}

async function loadYaml() {
  // Use the yaml package that Quartz itself depends on, from the site's node_modules.
  try {
    const require = createRequire(path.join(root, "package.json"))
    const resolved = require.resolve("yaml")
    return await import(pathToFileURL(resolved).href)
  } catch {
    die(
      "Could not load the `yaml` package from this Quartz folder.\n  Run `npm install` in your Quartz folder first, then try again.",
    )
  }
}

if (flag("--list") || args.length === 0) {
  console.log("\n  Available themes:\n")
  for (const t of listThemes()) {
    const palettes = Object.keys(t.palettes)
      .map((p) => (p === t.defaultPalette ? `${p} (default)` : p))
      .join(", ")
    console.log(`  ${t.id.padEnd(14)} ${t.name}`)
    console.log(`  ${"".padEnd(14)} ${t.description}`)
    console.log(`  ${"".padEnd(14)} palettes: ${palettes}\n`)
  }
  console.log("  Usage: node apply-theme.mjs <theme> [--palette <name>] | --restore\n")
  process.exit(0)
}

assertQuartzRoot()

if (flag("--restore")) {
  if (!fs.existsSync(backupConfig) || !fs.existsSync(backupScss)) {
    die("No backup found (.quartz-themes-backup/). Nothing to restore.")
  }
  fs.copyFileSync(backupConfig, configPath)
  fs.copyFileSync(backupScss, scssPath)
  fs.rmSync(backupDir, { recursive: true, force: true })
  console.log("\n  Restored quartz.config.yaml and custom.scss from backup. Backup removed.\n")
  process.exit(0)
}

const themeId = args.find((a) => !a.startsWith("--") && a !== opt("--palette"))
const theme = listThemes().find((t) => t.id === themeId)
if (!theme) {
  die(`Unknown theme "${themeId}". Run with --list to see what is available.`)
}
const paletteName = opt("--palette") ?? theme.defaultPalette
const palette = theme.palettes[paletteName]
if (!palette) {
  die(
    `Theme "${theme.id}" has no palette "${paletteName}". Options: ${Object.keys(theme.palettes).join(", ")}`,
  )
}

// 1. Snapshot the originals once.
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir)
  fs.copyFileSync(configPath, backupConfig)
  fs.copyFileSync(scssPath, backupScss)
  console.log(`\n  Backed up your original config and custom.scss to ${path.relative(root, backupDir)}/`)
}

// 2. Stylesheet.
fs.copyFileSync(path.join(themesDir, theme.id, "custom.scss"), scssPath)

// 3. Config: start from the snapshot so themes never stack, then patch typography and colors.
const YAML = await loadYaml()
const doc = YAML.parseDocument(fs.readFileSync(backupConfig, "utf8"))
if (!doc.hasIn(["configuration", "theme"])) {
  die("quartz.config.yaml has no configuration.theme section. Is this a Quartz 5 config?")
}
doc.setIn(["configuration", "theme", "typography"], doc.createNode(theme.typography))
doc.setIn(
  ["configuration", "theme", "colors"],
  doc.createNode({ lightMode: palette.lightMode, darkMode: palette.darkMode }),
)
fs.writeFileSync(configPath, doc.toString({ lineWidth: 0 }))

console.log(`\n  Applied ${theme.name} (${paletteName} palette).`)
console.log("  Changed: quartz/styles/custom.scss, configuration.theme in quartz.config.yaml")
console.log("\n  Next:  npx quartz build --serve\n")
