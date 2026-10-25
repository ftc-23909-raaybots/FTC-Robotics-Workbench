package org.firstinspires.ftc.robotcore.external;

import java.util.*;

public class Telemetry {
    private final List<Entry> pending = new ArrayList<>();
    private final List<Entry> displayed = new ArrayList<>();
    private final List<Runnable> actions = new ArrayList<>();
    private final Log log = new Log();
    private boolean autoClear = true;
    private int transmissionIntervalMs = 250;

    public synchronized Item addData(String caption, Object value) {
        Entry entry = new Entry("data", caption, value, null);
        pending.add(entry);
        return new Item(entry);
    }

    public synchronized Item addData(String caption, String format, Object... args) {
        return addData(caption, String.format(Locale.getDefault(), format, args));
    }

    public synchronized Item addData(String caption, Func<?> valueProducer) {
        Entry entry = new Entry("data", caption, null, valueProducer);
        pending.add(entry);
        return new Item(entry);
    }

    public synchronized Item addLine(String line) {
        Entry entry = new Entry("line", "", line, null);
        pending.add(entry);
        return new Item(entry);
    }

    public synchronized Item addLine() {
        Entry entry = new Entry("line", "", "", null);
        pending.add(entry);
        return new Item(entry);
    }

    public synchronized boolean update() {
        for (Runnable action : new ArrayList<>(actions)) action.run();
        List<Entry> frame = new ArrayList<>();
        for (Entry entry : pending) {
            Object value = entry.valueProducer == null ? entry.value : entry.valueProducer.value();
            frame.add(new Entry(entry.type, entry.caption, value, null));
        }
        displayed.clear();
        displayed.addAll(frame);
        if (autoClear) pending.clear();
        return true;
    }

    public synchronized void clear() {
        pending.clear();
        displayed.clear();
    }

    public synchronized void clearAll() {
        clear();
        log.clear();
    }

    public synchronized boolean isAutoClear() {
        return autoClear;
    }

    public synchronized void setAutoClear(boolean autoClear) {
        this.autoClear = autoClear;
    }

    public synchronized int getMsTransmissionInterval() {
        return transmissionIntervalMs;
    }

    public synchronized void setMsTransmissionInterval(int intervalMs) {
        if (intervalMs < 0) throw new IllegalArgumentException("Telemetry interval cannot be negative.");
        transmissionIntervalMs = intervalMs;
    }

    public synchronized void addAction(Runnable action) {
        if (action != null && !actions.contains(action)) actions.add(action);
    }

    public synchronized void removeAction(Runnable action) {
        actions.remove(action);
    }

    public Log log() {
        return log;
    }

    public synchronized Map<String, Object> snapshot() {
        Map<String, Object> result = new LinkedHashMap<>();
        for (Entry entry : displayed) {
            if ("data".equals(entry.type)) result.put(entry.caption, entry.value);
        }
        return result;
    }

    public synchronized List<Map<String, Object>> displaySnapshot() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Entry entry : displayed) result.add(entry.snapshot());
        return result;
    }

    private static final class Entry {
        private final String type;
        private String caption;
        private Object value;
        private Func<?> valueProducer;

        private Entry(String type, String caption, Object value, Func<?> valueProducer) {
            this.type = type;
            this.caption = caption;
            this.value = value;
            this.valueProducer = valueProducer;
        }

        private Map<String, Object> snapshot() {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("type", type);
            result.put("caption", caption);
            result.put("value", value);
            return result;
        }
    }

    public class Item {
        private final Entry entry;

        private Item(Entry entry) {
            this.entry = entry;
        }

        public Item setValue(Object value) {
            synchronized (Telemetry.this) {
                entry.value = value;
                entry.valueProducer = null;
            }
            return this;
        }

        public Item setValue(String format, Object... args) {
            return setValue(String.format(Locale.getDefault(), format, args));
        }

        public Item setValue(Func<?> valueProducer) {
            synchronized (Telemetry.this) {
                entry.valueProducer = valueProducer;
            }
            return this;
        }

        public Item setCaption(String caption) {
            synchronized (Telemetry.this) {
                entry.caption = caption;
            }
            return this;
        }

        public String getCaption() {
            return entry.caption;
        }
    }

    public static class Log {
        public enum DisplayOrder { OLDEST_FIRST, NEWEST_FIRST }
        private final List<String> lines = new ArrayList<>();
        private int capacity = 9;
        private DisplayOrder displayOrder = DisplayOrder.OLDEST_FIRST;

        public synchronized void add(String line) {
            add("%s", line);
        }

        public synchronized void add(String format, Object... args) {
            lines.add(String.format(Locale.getDefault(), format, args));
            while (lines.size() > capacity) lines.remove(0);
        }

        public synchronized void clear() {
            lines.clear();
        }

        public synchronized void setCapacity(int capacity) {
            if (capacity < 0) throw new IllegalArgumentException("Telemetry log capacity cannot be negative.");
            this.capacity = capacity;
            while (lines.size() > capacity) lines.remove(0);
        }

        public synchronized int getCapacity() {
            return capacity;
        }

        public synchronized void setDisplayOrder(DisplayOrder displayOrder) {
            this.displayOrder = Objects.requireNonNull(displayOrder);
        }

        public synchronized DisplayOrder getDisplayOrder() {
            return displayOrder;
        }

        public synchronized List<String> snapshot() {
            List<String> result = new ArrayList<>(lines);
            if (displayOrder == DisplayOrder.NEWEST_FIRST) Collections.reverse(result);
            return result;
        }
    }
}
