# Scribe - Clean Editor for Micro.blog

A clean web based editor for Micro.blog. This is a fork of [Wall](https://github.com/davidmerfield/wall) that extends the publising functionality beyond just Blot.

This editor works completely **client-side** -- however, it does route the Micro.blog APIs through a self-hosted reverse proxy [cors-anywhere](https://github.com/Rob--W/cors-anywhere/) to overcome the CORS restriction on Micro.blog.

- Auto-save local drafts
- Export posts as Markdown
- ~~Upload Markdown to a Dropbox folder~~
- Authenticate with and Publish to Micro.blog

### TODO

* [ ] Improve modal boxes and toolbar
* [x] Usable on mobile screens
* [x] Make editor a micropub client to update any sites
* [x] Allow changing title of the uploaded file
