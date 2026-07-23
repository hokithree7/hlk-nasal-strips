#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Migrate inline footer blocks at the end of blog markdown bodies into the
`footer:` frontmatter field (YAML literal block scalar).

Idempotent: skips files already containing a `footer:` field, or with no
detectable footer block.

Detected footer formats (both seen in the repo):
  Format A:  ---\n**Slogan**: ...\n**Website**: ...\n**Name**: ...\n...
  Format B:  ---\n**Signature**\nOne-Stop Custom Tape ...\nWebsite: ...\n...
Both normalized to Format A (with **bold** labels) for consistent rendering.
"""
import os
import re
import sys

BLOG_DIR = r"D:\D独立站资料\产品图片\hlk-nasal-strips\src\content\blog"


def find_footer_split(body):
    lines = body.split("\n")
    contact_markers = (
        "salesmanager@hlktape.com",
        "**Contact**",
        "**Website**",
        "**Name**",
        "**Slogan**",
        "Slogan",
    )
    # Primary: last '---' followed by a signature block
    for idx in range(len(lines) - 1, -1, -1):
        if lines[idx].strip() == "---":
            after = [l for l in lines[idx + 1:] if l.strip() != ""]
            tail = "\n".join(after)
            has_slogan = ("One-Stop Custom Tape" in tail) or ("Slogan" in tail)
            has_contact = any(mk in tail for mk in contact_markers)
            if has_slogan and has_contact:
                return idx
    # Fallback: a Slogan/footer line at the very end
    for idx in range(len(lines) - 1, -1, -1):
        if re.match(r"^\*\*Slogan\*\*:|^One-Stop Custom Tape", lines[idx]):
            tail = "\n".join(lines[idx:])
            if any(mk in tail for mk in contact_markers):
                return idx
    return None


def normalize_footer_block(lines):
    out = []
    for l in lines:
        s = l.rstrip()
        if s.strip() == "":
            continue
        label_lower = s.strip().strip("*").strip().lower()
        if label_lower == "signature":
            continue  # drop the "Signature" header (Format B)
        # Slogan line: contains One-Stop but no colon
        if "One-Stop Custom Tape" in s and ":" not in s:
            out.append(f"**Slogan**: {s}")
            continue
        # label: value
        m = re.match(r"^([A-Za-z][\w/ ]*?)\s*:\s*(.*)$", s)
        if m and "http" not in m.group(1):
            label = m.group(1).strip()
            val = m.group(2).strip()
            if label.startswith("**") and label.endswith("**"):
                out.append(s)  # already bold-wrapped
            else:
                out.append(f"**{label}**: {val}")
        else:
            out.append(s)
    return out


def migrate_file(path, dry_run=False):
    with open(path, "r", encoding="utf-8") as f:
        full = f.read()

    m = re.match(r"^(---\n.*?\n---\n)(.*)$", full, re.S)
    if not m:
        return False, "no frontmatter"
    fm = m.group(1)
    body = m.group(2)

    # Skip if already migrated
    if re.search(r"^\s*footer\s*:\s*\|", fm, re.M):
        return False, "already has footer field"

    split_idx = find_footer_split(body)
    if split_idx is None:
        return False, "no footer block detected"

    raw_footer_lines = body.split("\n")[split_idx + 1:]
    norm = normalize_footer_block(raw_footer_lines)
    if not norm:
        return False, "empty footer after normalize"

    new_body = "\n".join(body.split("\n")[:split_idx]).rstrip() + "\n"

    # Rebuild frontmatter with footer inserted before closing '---'
    assert fm.startswith("---\n") and fm.rstrip().endswith("---"), "bad frontmatter bounds"
    inner = fm[4:].rstrip("\n")          # drop leading '---\n' and trailing newlines
    inner_lines = inner.split("\n")
    closing = inner_lines[-1]            # '---'
    fields_part = inner_lines[:-1]
    footer_block = ["footer: |"] + [f"  {l}" for l in norm]
    new_fm = "---\n" + "\n".join(fields_part) + "\n" + "\n".join(footer_block) + "\n" + closing + "\n"

    new_full = new_fm + new_body

    if not dry_run:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_full)

    return True, f"footer {len(norm)} lines moved; body now {len(new_body.splitlines())} lines"


def main():
    dry = "--dry" in sys.argv
    files = sorted(glob_files())
    migrated = 0
    skipped = 0
    for fp in files:
        ok, msg = migrate_file(fp, dry_run=dry)
        name = os.path.basename(fp)
        if ok:
            migrated += 1
            print(f"  [MIGRATE] {name}: {msg}")
        else:
            skipped += 1
            if "no footer" in msg or "already" in msg:
                pass  # quiet
            else:
                print(f"  [skip] {name}: {msg}")
    print(f"\n{'DRY RUN — ' if dry else ''}Migrated: {migrated}, Skipped: {skipped}, Total: {len(files)}")


def glob_files():
    import glob
    return glob.glob(os.path.join(BLOG_DIR, "*.md"))


if __name__ == "__main__":
    main()
