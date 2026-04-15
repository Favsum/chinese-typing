import type { Course, CourseItem, CourseManifestItem } from '../types';

type ManifestEntry =
  | string
  | {
      id?: string;
      file?: string;
      label?: string;
      name?: string;
    };

const isCourseItem = (item: unknown): item is CourseItem => {
  if (!item || typeof item !== 'object') {
    return false;
  }

  const record = item as Record<string, unknown>;
  return typeof record.hanzi === 'string' && typeof record.pinyin === 'string';
};

/**
 * Parses the traditional TXT format:
 * Hanzi[Tab/Space]Pinyin
 */
export const parseContent = (content: string): CourseItem[] => {
  return content
    .trim()
    .split('\n')
    .map((line) => {
      const parts = line.includes('\t') ? line.split('\t') : line.split(/\s+/);
      const hanzi = parts[0]?.trim();
      const pinyin = parts[1]?.trim();

      if (!hanzi) return null;
      return {
        hanzi,
        pinyin: pinyin || '',
      };
    })
    .filter((item): item is CourseItem => item !== null);
};

const parseJsonCourse = (data: unknown): CourseItem[] => {
  if (Array.isArray(data)) {
    return data.filter(isCourseItem);
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.items)) {
      return record.items.filter(isCourseItem);
    }
  }

  return [];
};

export const fetchCourseManifest = async (): Promise<CourseManifestItem[]> => {
  try {
    const manifestRes = await fetch('courses/manifest.json');
    if (!manifestRes.ok) return [];

    const manifestData: unknown = await manifestRes.json();
    if (!Array.isArray(manifestData)) return [];

    return manifestData
      .map((entry, index) => {
        let id = '';
        let explicitLabel = '';

        if (typeof entry === 'string') {
          id = entry;
        } else if (entry && typeof entry === 'object') {
          const record = entry as Exclude<ManifestEntry, string>;
          id = record.id || record.file || '';
          explicitLabel = record.label || record.name || '';
        }

        if (!id) return null;

        return {
          id,
          index,
          label: explicitLabel.trim() || `常用词${index + 1}`,
        };
      })
      .filter((item): item is CourseManifestItem => item !== null);
  } catch (error) {
    console.debug('No external courses manifest found.', error);
    return [];
  }
};

export const loadCourseById = async (courseId: string, courseName: string): Promise<Course | null> => {
  try {
    const res = await fetch(`courses/${courseId}`);
    if (!res.ok) return null;

    let items: CourseItem[] = [];
    let rawContent = '';

    if (courseId.endsWith('.json')) {
      const jsonData: unknown = await res.json();
      rawContent = JSON.stringify(jsonData);
      items = parseJsonCourse(jsonData);
    } else {
      rawContent = await res.text();
      items = parseContent(rawContent);
    }

    if (items.length === 0) return null;

    return {
      id: courseId,
      name: courseName,
      items,
      rawContent,
    };
  } catch (error) {
    console.warn(`Failed to load course file: ${courseId}`, error);
    return null;
  }
};
