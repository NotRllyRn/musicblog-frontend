"use client"

import { useMemo, useState } from "react"
import { AppShell } from "@astryxdesign/core/AppShell"
import { Badge } from "@astryxdesign/core/Badge"
import { Button } from "@astryxdesign/core/Button"
import { Card } from "@astryxdesign/core/Card"
import { Heading } from "@astryxdesign/core/Heading"
import { HStack } from "@astryxdesign/core/HStack"
import {
  pixel,
  proportional,
  Table,
  type TableColumn,
} from "@astryxdesign/core/Table"
import { Text } from "@astryxdesign/core/Text"
import { TextArea } from "@astryxdesign/core/TextArea"
import { TextInput } from "@astryxdesign/core/TextInput"
import { VStack } from "@astryxdesign/core/VStack"

interface JournalEntry extends Record<string, unknown> {
  id: string
  album: string
  artist: string
  rating: string
  listened: string
}

const entries: JournalEntry[] = [
  {
    id: "midnight-orbit",
    album: "Midnight Orbit",
    artist: "Nova Coast",
    rating: "4.8 / 5",
    listened: "Jun 12",
  },
  {
    id: "blue-static",
    album: "Blue Static",
    artist: "Signal Garden",
    rating: "4.3 / 5",
    listened: "Jun 9",
  },
  {
    id: "velvet-meteor",
    album: "Velvet Meteor",
    artist: "Kira Vale",
    rating: "4.6 / 5",
    listened: "Jun 7",
  },
]

const columns: TableColumn<JournalEntry>[] = [
  { key: "album", header: "Album", width: proportional(2) },
  { key: "artist", header: "Artist", width: proportional(1) },
  { key: "rating", header: "Rating", width: pixel(112) },
  { key: "listened", header: "Listened", width: pixel(96) },
]

export function MusicJournalDemo() {
  const [query, setQuery] = useState("")
  const [note, setNote] = useState(
    "Warm synths, patient drums, and a great final track."
  )
  const [isSaved, setIsSaved] = useState(false)

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return entries
    }

    return entries.filter((entry) =>
      `${entry.album} ${entry.artist}`.toLowerCase().includes(normalizedQuery)
    )
  }, [query])

  return (
    <AppShell contentPadding={6} height="auto" variant="surface">
      <VStack gap={8} maxWidth="960px" data-foundation-check>
        <VStack as="header" gap={2}>
          <Heading level={1} textWrap="balance">
            Music journal foundation
          </Heading>
          <Text as="p" color="secondary" display="block">
            A clean starting point for testing Astryx before the WordPress data
            layer is connected.
          </Text>
        </VStack>

        <Card padding={6}>
          <VStack gap={5}>
            <VStack gap={2}>
              <Text type="supporting" display="block">
                Currently listening
              </Text>
              <Heading level={2}>Midnight Orbit</Heading>
              <Text as="p" color="secondary" display="block">
                Nova Coast · A glossy synth-pop record built for late-night
                headphones.
              </Text>
            </VStack>

            <HStack gap={2} wrap="wrap">
              <Badge label="Synth-pop" variant="blue" />
              <Badge label="Night drive" variant="purple" />
              <Badge label="Favorite" variant="pink" />
            </HStack>

            <TextArea
              label="Listening note"
              description="Try the Astryx input and validation spacing."
              value={note}
              onChange={(value) => {
                setNote(value)
                setIsSaved(false)
              }}
              rows={4}
              maxLength={240}
            />

            <HStack gap={3} wrap="wrap" vAlign="center">
              <Button
                label={isSaved ? "Note saved" : "Save listening note"}
                variant="primary"
                isDisabled={!note.trim() || isSaved}
                onClick={() => setIsSaved(true)}
              />
              <Button
                label="Clear note"
                variant="secondary"
                isDisabled={!note}
                onClick={() => {
                  setNote("")
                  setIsSaved(false)
                }}
              />
            </HStack>
          </VStack>
        </Card>

        <VStack as="section" gap={4}>
          <VStack gap={2}>
            <Heading level={2}>Recent listening</Heading>
            <Text as="p" color="secondary" display="block">
              Search the sample journal rows to exercise a controlled input and
              responsive data table.
            </Text>
          </VStack>

          <TextInput
            label="Search journal"
            placeholder="Album or artist"
            value={query}
            onChange={setQuery}
            hasClear
          />

          <Table
            data={filteredEntries}
            columns={columns}
            idKey="id"
            density="balanced"
            dividers="rows"
            hasHover
          />
        </VStack>
      </VStack>
    </AppShell>
  )
}
