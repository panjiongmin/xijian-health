import {
  ArrowLeft,
  BowlFood,
  Bread,
  Cake,
  Coffee,
  Cookie,
  ForkKnife,
  Hamburger,
  IceCream,
  ImageSquare,
  Popcorn,
  UploadSimple,
} from "@phosphor-icons/react";
import { useEffect, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api";
import { useAuth } from "../auth-context";
import type { UploadedAsset } from "../types";

const sugarOilFoods = [
  {
    name: "奶油蛋糕",
    scene: "生日、下午茶、饭后甜点",
    note: "精制糖、奶油和面粉叠加，容易在不饿时继续吃。",
    icon: Cake,
  },
  {
    name: "曲奇和夹心饼干",
    scene: "办公室零食、追剧加餐",
    note: "常见配料会同时出现白砂糖、起酥油、植物油或代可可脂。",
    icon: Cookie,
  },
  {
    name: "甜甜圈和油炸面包",
    scene: "早餐、便利店点心",
    note: "油炸面团再加糖霜，口感很轻，但能量密度通常不低。",
    icon: Bread,
  },
  {
    name: "奶盖奶茶",
    scene: "外卖饮品、逛街饮料",
    note: "糖浆、奶盖、植脂末或奶油一起出现时，更适合当甜点看待。",
    icon: Coffee,
  },
  {
    name: "冰淇淋和雪糕",
    scene: "夜宵、饭后奖励",
    note: "甜味和脂肪带来顺滑口感，建议控制频率和份量。",
    icon: IceCream,
  },
  {
    name: "巧克力派和威化",
    scene: "书包零食、随手补能",
    note: "夹心、涂层、酥皮组合常见，吃之前先看配料表。",
    icon: Popcorn,
  },
];

const ingredientHints = ["白砂糖", "葡萄糖浆", "麦芽糖浆", "植脂末", "起酥油", "人造奶油", "代可可脂", "精炼植物油"];

export function NutritionPage() {
  const { user } = useAuth();
  const [images, setImages] = useState<UploadedAsset[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState("");

  useEffect(() => {
    if (!user) return;
    setImagesLoading(true);
    apiRequest<{ images: UploadedAsset[] }>("/api/nutrition/images")
      .then((result) => setImages(result.images))
      .catch(() => setImageError("饮食图片暂时没有加载成功。"))
      .finally(() => setImagesLoading(false));
  }, [user]);

  const uploadNutritionImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || uploading) return;
    setUploading(true);
    setImageError("");
    try {
      const form = new FormData();
      form.append("kind", "nutrition");
      form.append("file", file);
      const result = await apiRequest<{ asset: UploadedAsset }>("/api/assets/upload", {
        method: "POST",
        body: form,
      });
      setImages((items) => [result.asset, ...items].slice(0, 24));
    } catch {
      setImageError("图片没有上传成功，请换一张 4MB 以内的图片。");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="nutrition-page page-width">
      <Link className="back-link" to="/discover"><ArrowLeft /> 返回发现</Link>
      <header className="page-heading nutrition-heading">
        <span className="eyebrow">饮食健康</span>
        <h1>先识别常见的糖油混合物。</h1>
        <p>不是禁止食物，而是帮你看见哪些东西更适合偶尔吃。</p>
      </header>

      <section className="nutrition-hero-card">
        <div className="nutrition-hero-icon">
          <ForkKnife weight="duotone" />
        </div>
        <div>
          <h2>简单判断法</h2>
          <p>如果一种零食同时依赖甜味和油脂来增强口感，就把它当作甜点，而不是日常补充能量。</p>
        </div>
        <div className="nutrition-hero-note">
          <strong>优先动作</strong>
          <span>少囤货，少空腹吃，想吃时小份量吃完就停。</span>
        </div>
      </section>

      <section className="nutrition-upload-card">
        <div>
          <span className="food-icon"><ImageSquare weight="duotone" /></span>
          <h2>我的饮食图片</h2>
          <p>把容易忽略的零食、外卖或配料表拍下来，慢慢形成自己的饮食观察记录。</p>
        </div>
        {user ? (
          <div className="nutrition-upload-panel">
            <label className="primary-button">
              <UploadSimple />
              {uploading ? "正在上传" : "上传图片"}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => void uploadNutritionImage(event)} disabled={uploading} />
            </label>
            {imageError && <p className="form-error">{imageError}</p>}
            {imagesLoading ? (
              <div className="nutrition-image-grid loading" aria-label="正在加载饮食图片">
                <span />
                <span />
                <span />
              </div>
            ) : images.length > 0 ? (
              <div className="nutrition-image-grid">
                {images.map((image) => image.url && (
                  <figure key={image.id}>
                    <img src={image.url} alt={image.originalName ? `饮食图片：${image.originalName}` : "饮食图片"} loading="lazy" decoding="async" />
                  </figure>
                ))}
              </div>
            ) : (
              <p className="nutrition-upload-empty">还没有上传图片。可以先拍一张配料表或常吃零食。</p>
            )}
          </div>
        ) : (
          <div className="nutrition-upload-panel guest">
            <p>登录后可以把饮食图片保存到你的 R2 空间。</p>
            <Link className="secondary-button" to="/login?next=/nutrition">登录后上传</Link>
          </div>
        )}
      </section>

      <section className="sugar-oil-section">
        <div className="section-heading narrow">
          <h2>常见清单</h2>
          <p>这些不是坏食物清单，只是提醒你它们更容易越吃越多。</p>
        </div>
        <div className="sugar-oil-grid">
          {sugarOilFoods.map(({ name, scene, note, icon: Icon }) => (
            <article className="sugar-oil-card" key={name}>
              <span className="food-icon"><Icon weight="duotone" /></span>
              <div>
                <h3>{name}</h3>
                <small>{scene}</small>
              </div>
              <p>{note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="nutrition-guide">
        <article>
          <BowlFood weight="duotone" />
          <h2>替代思路</h2>
          <p>想吃甜味时，优先选择水果、无糖酸奶、原味坚果或正餐里留一点主食空间。</p>
        </article>
        <article>
          <Hamburger weight="duotone" />
          <h2>看配料表</h2>
          <p>如果前几位同时出现糖类和油脂类原料，就把它归到“偶尔吃”的位置。</p>
          <div className="ingredient-tags">
            {ingredientHints.map((item) => <span key={item}>{item}</span>)}
          </div>
        </article>
      </section>
    </div>
  );
}
