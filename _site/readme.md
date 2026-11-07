# Portfolio Website

A custom portfolio website built with Jekyll, Liquid, HTML, CSS, and JavaScript. Project content is managed through a LibreOffice Calc workbook and exported into Jekyll Markdown files using a custom Basic macro.

## Project Structure

- `_projects/` — Generated Markdown files for individual portfolio projects.
- `_layouts/` — Shared page layouts.
- `assets/css/` — Site stylesheets.
- `assets/js/` — Site JavaScript.
- `assets/images/` — Project images and other visual assets.
- `data.ods` — LibreOffice Calc workbook used to manage project content and galleries.
- `index.html` — Portfolio homepage.
- `_config.yml` — Jekyll site configuration.
- `Gemfile` — Ruby dependencies.

## Content Management

Project information is maintained in `data.ods`, located in the repository root.

The workbook separates project metadata from gallery information:

- **Projects:** Project titles, slugs, descriptions, tags, featured status, display order, thumbnails, page layouts, and other metadata.
- **Gallery:** Image filenames, alt text, captions, gallery layouts, and ordering, associated with projects through their slugs.

The `GenerateProjectMarkdown()` LibreOffice Basic macro reads the workbook and generates the corresponding Markdown files in `_projects/`.

### Updating Projects

1. Edit project information in `data.ods`.
2. Check that project slugs and gallery references match.
3. Run `GenerateProjectMarkdown()` from LibreOffice.
4. Review the generated files in `_projects/`.
5. Run the local Jekyll server to preview the changes.

Generated Markdown files should be treated as output from the workbook rather than the primary place to edit project content.

## Local Development

The site uses Ruby, Bundler, and Jekyll.

Install dependencies if needed:

```bash
bundle install
```

Start the local development server:

```bash
bundle exec jekyll serve --port 4000
```

Open `http://localhost:4000` in a browser.

Stop the server with `Ctrl + C`.

## Notes

- Project metadata is stored in YAML front matter.
- `page_type` identifies the kind of page, such as `home` or `project`, and can control page-specific styling and behavior.
- The site uses a shared default layout, with page-specific content and behavior controlled through front matter and CSS/JavaScript.