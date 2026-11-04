# Fold Ruler & Grid Templates

Create frames from device presets with an automatic fold ruler that stays in place as your frame grows, and save reusable layout grid templates across your projects.

[![License: MIT License with Attribution Requirement](https://img.shields.io/badge/License-MIT%20License%20with%20Attribution%20Requirement-blue.svg)](LICENSE)

## Preview

![Create frames from presets with fold rulers]({{screenshot-create-frames}})
*Create frames for popular devices with instant fold rulers.*

![Fold ruler stays at screen height when frame extends]({{screenshot-fold-ruler}})
*The fold ruler stays at the initial screen fold when you lengthen a frame.*

![Save and reuse layout grid templates]({{screenshot-templates}})
*Customize and organize reusable layout grid templates.*

## What it does

When you design screens in Figma, frames quickly stretch to hold scrolling content, leaving you guessing where the initial viewport ended. Setting up consistent layout grids on every new frame also requires repetitive manual work. **Fold Ruler & Grid Templates** solves both problems by placing a permanent fold ruler at your original screen height and letting you apply custom layout grid templates with a single click.

## Features

- **Frames from presets or custom sizes**: Generate frames for phones, tablets, desktops, watches, presentations, social media, paper, and Figma Community assets, or enter custom dimensions.
- **Automatic fold ruler**: Automatically places a horizontal ruler at your initial screen height that stays right where it belongs when you extend the frame for scrolling content.
- **Visual line option & repeating folds**: Choose between Figma native guides, a locked visual dashed line with an optional height label, or both. You can also repeat rulers at every additional screen height down a long page.
- **Layout Guide templates**: Build reusable templates with columns, rows, or square grids. Set custom margins, gutters, alignments, and colors.
- **Default templates per device**: Assign default templates to specific devices or whole categories so new frames arrive with your preferred grid already applied.
- **Save templates from frames**: Select any frame on your canvas with layout grids and save its settings directly as a template.
- **Share with teammates**: Share templates in the current file for collaborators, or export and import template files to share with your team.

## Install

1. Open the plugin on Figma Community: [{{figma-community-url}}]({{figma-community-url}}).
2. Click **Try it out** or **Save**.
3. In any Figma file, right-click the canvas, go to **Plugins**, and select **Fold Ruler & Grid Templates**.

## Quick start

1. **Create a frame with a fold ruler**: In the **Create** tab, choose one or more presets (or enter a custom size), keep **Add fold ruler** checked, and click **Create frames**.
2. **Save a layout grid as a template**: Select any frame on your canvas that has layout grids, open the **Templates** tab, and click **Save from selection**. Give your template a name.
3. **Apply a template**: Select an existing frame, choose a template from the **Templates** tab, and click **Apply to selection** (or pick a template in the **Create** tab before generating new frames).

## Good to know

**I cannot see the ruler. Where is it?**
Turn on Figma rulers by pressing **Shift+R** (or go to **Figma menu → View → Rulers**). If you prefer a visible line directly on your canvas, open the plugin **Settings** tab and set the ruler mode to **Visual line layer** or **Both**.

**Do rulers appear in exports?**
Native guides never appear in exported images or PDFs. Visible dashed lines do appear in exports. You can clean them up before exporting by clicking **Remove visual rulers** on the **Create** tab.

**Will my own guides be touched?**
No. The plugin only updates or removes the rulers that it created. Your personal horizontal and vertical guides are never removed or altered.

**Where are templates stored, and do they sync?**
Templates are saved locally on your computer for your Figma account. To share templates with collaborators in a file, turn on **Share in this file** inside the template editor, or use the **Export** and **Import** buttons to exchange template files.

**Does it work on existing frames?**
Yes. Select any frame and run the plugin menu commands under **Plugins → Fold Ruler & Grid Templates**:
- **Add fold ruler to selection**: Adds or updates a fold ruler at the preset height or current frame height.
- **Apply default template to selection**: Applies the default layout grid configured for that frame size.
- **Remove plugin rulers from selection**: Removes plugin fold rulers while keeping your own guides intact.

## Privacy

Fold Ruler & Grid Templates runs entirely inside Figma. It makes no network requests, transmits no data, and collects no analytics. Everything stays private on your machine and inside your Figma files.

## Feedback & support

For issues, questions, or feature requests, open an issue at [{{github-issues-url}}]({{github-issues-url}}) or visit the [creator website](https://waiphyoaungdesign.vercel.app/).

## About the creator

Created by Lucas.
- [Website](https://waiphyoaungdesign.vercel.app/)
- [LinkedIn](https://www.linkedin.com/in/waiphyoaung-design)
- [Facebook](https://www.facebook.com/share/1A18JZwywF/?mibextid=wwXIfr)

## License & Copyright

Copyright © 2026 Lucas. Released under the MIT License with Attribution Requirement. You are free to use, modify, and share this plugin, but the copyright notice and the visible credit to Lucas must be kept in all copies, forks, and derivative works. See [LICENSE](LICENSE) for details.

---

Figma is a trademark of Figma, Inc. This plugin is an independent project and is not affiliated with or endorsed by Figma.
