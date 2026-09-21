# Publish or edit a developer message

1. Open https://supabase.com/dashboard/project/fwnvwkffxazwsmaiqayj/editor and select the public **system_messages** table.
2. To change the welcome text, edit the row titled **Thank You for Playing Saturday Dynasty Football ❤️**. Edit **title** and **body**, then save. Blank lines separate paragraphs; wrap words in **double asterisks** for bold.
3. To send a NEW announcement, use **Insert row**. Leave **id** at its generated default. Fill **title** and **body**. Use **platform = all** for app and browser, **min_build = 243**, **enabled = true**, and leave **published_at** at its current-time default. Leave **expires_at** empty unless it should expire.
4. Save the row. Updated clients check on launch and when returning to the app/browser (at most once per hour during a session).

## Important behaviour
- Editing an existing row updates its text but does NOT reset acknowledgements. To show something again to everyone, insert a NEW row with a NEW id.
- Turn **enabled** off to withdraw a message from future online fetches. Future **published_at** dates schedule publication; **expires_at** hides expired messages.
- Acknowledgement is stored on the device/browser, separately per signed-in browser account. It is not cross-device synchronization. Reinstalling or clearing storage can show messages again.
- The built-in thank-you works offline. Changing the database changes the online copy; changing that bundled offline fallback requires an app update.
- Messages are displayed as safe text with bold support, not executable HTML. Players have read-only database access to published messages.
- Messages wait for other popups to close and do not require advertising/analytics ID tracking.

Your exact launch message is already stored in the database and bundled in Build 243.
