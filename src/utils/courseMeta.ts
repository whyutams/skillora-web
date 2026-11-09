export interface CourseParsedMeta {
  description: string;
  content: string;
  imageUrl: string | null;
  registrationStart: string | null;
  registrationEnd: string | null;
  eventStart: string | null;
  eventEnd: string | null;
  discountPercent: number;
  level: string | null;
  category: string | null;
  targetLearning: string[] | string | null;
  syllabus: unknown[] | string | null;
}

export interface CourseEncodeParams {
  description?: string;
  content?: string;
  imageUrl?: string | null;
  registrationStart?: string | null;
  registrationEnd?: string | null;
  eventStart?: string | null;
  eventEnd?: string | null;
  discountPercent?: number;
  level?: string | null;
  category?: string | null;
  targetLearning?: string[] | string | null;
  syllabus?: unknown[] | string | null;
}

export function parseCourseDescription(rawDesc: string | null | undefined): CourseParsedMeta {
  if (!rawDesc) {
    return {
      description: "",
      content: "",
      imageUrl: null,
      registrationStart: null,
      registrationEnd: null,
      eventStart: null,
      eventEnd: null,
      discountPercent: 0,
      level: null,
      category: null,
      targetLearning: null,
      syllabus: null,
    };
  }

  // periksa format json meta
  const metaMatch = rawDesc.match(/^<!--meta:(.*?)-->\s*/);
  if (metaMatch) {
    try {
      const parsedMeta = JSON.parse(metaMatch[1]);
      const htmlContent = rawDesc.replace(metaMatch[0], "").trim();
      return {
        description: parsedMeta.description || "",
        content: htmlContent || parsedMeta.content || "",
        imageUrl: parsedMeta.image_url || null,
        registrationStart: parsedMeta.registration_start || null,
        registrationEnd: parsedMeta.registration_end || null,
        eventStart: parsedMeta.event_start || null,
        eventEnd: parsedMeta.event_end || null,
        discountPercent: Number(parsedMeta.discount_percent || 0),
        level: parsedMeta.level || null,
        category: parsedMeta.category || null,
        targetLearning: parsedMeta.target_learning || null,
        syllabus: parsedMeta.syllabus || null,
      };
    } catch {
      // pengembalian aman jika json gagal diurai
    }
  }

  // periksa format legacy image
  const imgMatch = rawDesc.match(/^<!--image:(.*?)-->\s*/);
  if (imgMatch) {
    const imgUrl = imgMatch[1];
    const htmlContent = rawDesc.replace(imgMatch[0], "").trim();
    return {
      description: htmlContent.replace(/<[^>]*>?/gm, "").trim(),
      content: htmlContent,
      imageUrl: imgUrl || null,
      registrationStart: null,
      registrationEnd: null,
      eventStart: null,
      eventEnd: null,
      discountPercent: 0,
      level: null,
      category: null,
      targetLearning: null,
      syllabus: null,
    };
  }

  return {
    description: rawDesc.replace(/<[^>]*>?/gm, "").trim(),
    content: rawDesc,
    imageUrl: null,
    registrationStart: null,
    registrationEnd: null,
    eventStart: null,
    eventEnd: null,
    discountPercent: 0,
    level: null,
    category: null,
    targetLearning: null,
    syllabus: null,
  };
}

export function encodeCourseDescription(params: CourseEncodeParams): string {
  const metaObj: Record<string, unknown> = {};

  if (params.imageUrl && params.imageUrl.trim()) {
    metaObj.image_url = params.imageUrl.trim();
  }
  if (params.description && params.description.trim()) {
    metaObj.description = params.description.trim();
  }
  if (params.registrationStart && params.registrationStart.trim()) {
    metaObj.registration_start = params.registrationStart.trim();
  }
  if (params.registrationEnd && params.registrationEnd.trim()) {
    metaObj.registration_end = params.registrationEnd.trim();
  }
  if (params.eventStart && params.eventStart.trim()) {
    metaObj.event_start = params.eventStart.trim();
  }
  if (params.eventEnd && params.eventEnd.trim()) {
    metaObj.event_end = params.eventEnd.trim();
  }
  if (params.discountPercent !== undefined && params.discountPercent !== null) {
    metaObj.discount_percent = params.discountPercent;
  }
  if (params.level && params.level.trim()) {
    metaObj.level = params.level.trim();
  }
  if (params.category && params.category.trim()) {
    metaObj.category = params.category.trim();
  }
  if (params.targetLearning) {
    metaObj.target_learning = params.targetLearning;
  }
  if (params.syllabus) {
    metaObj.syllabus = params.syllabus;
  }

  const content = (params.content || "").trim();

  if (Object.keys(metaObj).length === 0) {
    return content;
  }

  return `<!--meta:${JSON.stringify(metaObj)}-->\n${content}`;
}
