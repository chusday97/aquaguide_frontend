import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Fish, Aquarium, DeceasedRecord } from '../types';
import { fishData } from '../data/fishData';
import { Bot, BookOpen, ChevronRight, Skull, Droplets, Droplet, Search, Thermometer, Heart, HeartOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThreeAquarium } from '../components/ThreeAquarium';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getSpeciesDisplayImage } from '../lib/speciesVisual';

const getDifficultyLabel = (difficulty: string) => {
  switch (difficulty) {
    case 'Easy': return '新手适宜';
    case 'Medium': return '进阶挑战';
    case 'Hard': return '骨灰级玩家';
    default: return difficulty;
  }
};


export default function Home() {
  const [defaultAquarium, setDefaultAquarium] = useState<Aquarium | null>(null);
  const [ownedFishes, setOwnedFishes] = useState<Fish[]>([]);
  const [deceasedRecords, setDeceasedRecords] = useState<DeceasedRecord[]>([]);
  const [wishlistFishIds, setWishlistFishIds] = useState<Set<string>>(new Set());
  const [selectedFish, setSelectedFish] = useState<Fish | null>(null);

  useEffect(() => {
    // Load aquariums
    const saved = localStorage.getItem('aquariums');
    if (saved) {
      try {
        const parsed: Aquarium[] = JSON.parse(saved);
        if (parsed.length > 0) {
          setDefaultAquarium(parsed[0]);
          
          // Collect owned fishes
          const allAqFishes = parsed.flatMap(a => a.fishes);
          const uniqueFishIds = Array.from(new Set(allAqFishes.map(af => af.fishId)));
          const fishes = uniqueFishIds.map(id => fishData.find(f => f.id === id)).filter(Boolean) as Fish[];
          setOwnedFishes(fishes);
        }
      } catch (e) {
        console.error('Failed to parse aquariums', e);
      }
    }

    // Load deceased records
    const savedDeceased = localStorage.getItem('deceasedRecords');
    if (savedDeceased) {
      try {
        setDeceasedRecords(JSON.parse(savedDeceased));
      } catch (e) {}
    }

    // Load wishlist
    const savedWishlist = localStorage.getItem('wishlistFishIds');
    if (savedWishlist) {
      setWishlistFishIds(new Set(JSON.parse(savedWishlist)));
    }
  }, []);

  const toggleWishlist = (id: string) => {
    const next = new Set(wishlistFishIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setWishlistFishIds(next);
    localStorage.setItem('wishlistFishIds', JSON.stringify(Array.from(next)));
    
    // If the currently selected fish was just un-wishlisted, close the dialog
    if (selectedFish && selectedFish.id === id && next.has(id) === false) {
      setSelectedFish(null);
    }
  };

  const emptyAquariumFallback: Aquarium = {
    id: 'empty_fallback',
    name: '默认鱼缸',
    fishes: [],
    dimensions: { length: '60', width: '40', height: '40' },
    waterType: 'Freshwater',
    substrate: '无',
    plants: [],
    hardscape: [],
    equipment: { filter: '瀑布过滤', heater: true, oxygen: false, light: '普通灯' }
  };

  const WishlistPreview = () => {
    if (wishlistFishIds.size === 0) {
      return (
        <div className="text-center py-4 text-ink/50 text-xs font-medium">
          还没有种草的内容，去图鉴看看吧～
        </div>
      );
    }
    
    return (
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-2">
          {Array.from(wishlistFishIds).map(id => {
            const fish = fishData.find(f => f.id === id);
            if (!fish) return null;
            return (
              <div key={id} onClick={() => setSelectedFish(fish)} className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-transparent group-hover:border-rose-300 transition-colors">
                  <img src={getSpeciesDisplayImage(fish)} alt={fish.name} className="h-full w-full object-contain bg-white p-1" referrerPolicy="no-referrer" />
                </div>
                <span className="text-[10px] font-bold text-ink w-16 text-center truncate">{fish.name}</span>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    );
  };

  return (
    <div className="flex flex-col gap-4 max-w-md mx-auto relative pb-20 md:max-w-[760px]">
      
      {/* 1. Aquarium Preview */}
      <section className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="font-serif font-bold text-lg text-ink">我的鱼缸 {defaultAquarium ? `(${defaultAquarium.name})` : ''}</h2>
          <Link to="/aquarium" className="text-xs font-bold text-accent hover:underline flex items-center">
            进入管理 <ChevronRight className="w-3 h-3 ml-0.5" />
          </Link>
        </div>
        <div className="relative h-[250px] w-full bg-[#f8f9fa] overflow-hidden group">
          <ThreeAquarium aquarium={defaultAquarium || emptyAquariumFallback} />
          {/* Overlay to catch clicks and redirect, or leave interactive? */}
          <Link to="/aquarium" className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-sm text-ink px-2 py-1 rounded-sm text-[10px] font-bold shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 border border-white/50">
            进入详细管理
          </Link>
        </div>
      </section>

      {/* Wishlist Section on Home */}
      <div>
        <h2 className="font-serif font-bold text-lg text-ink mb-2">我的种草清单</h2>
        <section className="bg-rose-50/50 rounded-xl shadow-sm border border-rose-100 overflow-hidden p-4">
          <WishlistPreview />
        </section>
      </div>

      {/* 2. Open Book (Encyclopedia & AI Assistant) */}
      <div>
        <h2 className="font-serif font-bold text-lg text-ink mb-2">水族百科</h2>
        <section className="relative w-full h-[180px] flex" style={{ perspective: '1200px' }}>
          {/* Left Page (Encyclopedia) */}
          <Link 
            to="/encyclopedia" 
            className="flex-1 bg-[#F4F1EA] rounded-l-lg shadow-[-4px_4px_10px_rgba(0,0,0,0.1)] border-y border-l border-[#C4BBA5] flex flex-col items-center justify-center p-4 relative group hover:bg-[#EAE4D6] transition-colors"
          >
            {/* Book Spine Shadow inside */}
            <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-r from-transparent to-black/10"></div>
            
            <h3 className="font-serif font-bold text-[#5c4a2a] mb-3 z-10 flex items-center gap-2">
                <BookOpen className="w-5 h-5" /> 养鱼图鉴
            </h3>
            
            <div className="flex justify-center z-10">
              {ownedFishes.length > 0 ? (
                  ownedFishes.slice(0, 3).map((fish, i) => (
                    <div key={i} className={`w-10 h-10 rounded-full overflow-hidden border-[3px] border-[#F4F1EA] shadow-md ${i > 0 ? '-ml-4' : ''}`}>
                      <img src={getSpeciesDisplayImage(fish)} className="h-full w-full object-contain bg-white p-1" alt="" referrerPolicy="no-referrer" />
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-[#7a6745] font-medium text-center">
                    查看所有水族生物资料
                  </div>
                )}
            </div>
          </Link>
          
          {/* Book Spine Center Line */}
          <div className="w-[3px] bg-gradient-to-b from-[#8B7A4E] via-[#5c4a2a] to-[#8B7A4E] shrink-0 z-20 shadow-[0_0_8px_rgba(0,0,0,0.5)]"></div>

          {/* Right Page (AI Assistant) */}
          <Link 
            to="/assistant" 
            className="flex-1 bg-[#F4F1EA] rounded-r-lg shadow-[4px_4px_10px_rgba(0,0,0,0.1)] border-y border-r border-[#C4BBA5] flex flex-col items-center justify-center p-4 relative group hover:bg-[#EAE4D6] transition-colors"
          >
            {/* Book Spine Shadow inside */}
            <div className="absolute top-0 bottom-0 left-0 w-8 bg-gradient-to-l from-transparent to-black/10"></div>
            
            <h3 className="font-serif font-bold text-[#5c4a2a] mb-3 z-10 flex items-center gap-2">
                <Bot className="w-5 h-5 text-accent" /> 养鱼助手 AI
            </h3>
            <div className="text-xs text-[#7a6745] font-medium text-center z-10 leading-relaxed px-2">
              实时解答养缸、水质、混养冲突等任何疑问
            </div>
          </Link>
        </section>
      </div>

      {/* 3. Deceased Memorial */}
      {deceasedRecords.length > 0 && (
        <div className="mt-4">
          <h2 className="font-serif font-bold text-lg text-ink mb-2">逝去生物纪念</h2>
          <section className="bg-white rounded-xl shadow-sm border border-border overflow-hidden p-4">
            <ScrollArea className="w-full max-h-[160px]">
              <div className="flex flex-wrap gap-4">
                {deceasedRecords.map((record) => {
                  const fishInfo = fishData.find(f => f.id === record.fishId);
                  if (!fishInfo) return null;
                  return (
                    <div key={record.id} className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 grayscale opacity-80 bg-bg/50">
                        <img src={fishInfo.image} alt={fishInfo.name} className="h-full w-full object-contain bg-white p-1" referrerPolicy="no-referrer" />
                      </div>
                      <div className="text-[10px] text-ink/70 font-medium">
                        {new Date(record.date).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </section>
        </div>
      )}

    {/* Fish Detail Dialog */}
    <Dialog open={!!selectedFish} onOpenChange={(open) => !open && setSelectedFish(null)}>
      <DialogContent className="w-[90vw] max-w-[600px] p-0 overflow-hidden border-border rounded-sm">
        {selectedFish && (
          <ScrollArea className="max-h-[85vh]">
            <div className="h-[180px] md:h-[240px] bg-bg relative border-b border-border">
              <img 
                src={selectedFish.image} 
                alt={selectedFish.name} 
                className="h-full w-full object-contain bg-white p-4 opacity-95"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-5 md:p-8 flex flex-col gap-5 bg-white">
              <div>
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <DialogTitle className="font-serif text-2xl md:text-3xl italic text-ink font-bold">{selectedFish.name}</DialogTitle>
                    <DialogDescription className="text-xs text-ink/70 mt-1 font-medium">{selectedFish.scientificName}</DialogDescription>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-1 bg-accent-light text-accent rounded-sm whitespace-nowrap border border-accent/20">
                    {getDifficultyLabel(selectedFish.difficulty)}
                  </span>
                </div>
              </div>

              <p className="text-sm md:text-[14px] leading-relaxed text-ink font-medium">
                {selectedFish.description}
              </p>

              <div className="grid grid-cols-2 gap-3 text-[12px] border-t border-b border-border py-4 bg-bg/50 px-3 rounded-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">水温</span>
                  <span className="text-ink font-bold">{selectedFish.waterTemperature}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">酸碱度 (pH)</span>
                  <span className="text-ink font-bold">{selectedFish.phLevel}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">换水周期</span>
                  <span className="text-ink font-bold">约 {selectedFish.waterChangeCycle} 天</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">鱼缸尺寸</span>
                  <span className="text-ink font-bold">{selectedFish.tankSize}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">性情</span>
                  <span className="text-ink font-bold">{selectedFish.temperament === 'Peaceful' ? '温和' : selectedFish.temperament === 'Aggressive' ? '凶猛' : '领地意识强'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">体型</span>
                  <span className="text-ink font-bold">{selectedFish.size === 'Small' ? '小型' : selectedFish.size === 'Medium' ? '中型' : '大型'}</span>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] uppercase tracking-[1px] text-ink/60 font-bold mb-1.5">饮食习惯</h4>
                <p className="text-sm md:text-[14px] text-ink font-medium">{selectedFish.diet}</p>
              </div>

              <div className="bg-accent-light/30 border border-accent/20 p-4 rounded-sm flex flex-col gap-3 mt-2">
                <div className="flex gap-2 mb-2">
                  <Button 
                    variant="outline" 
                    className={`flex-1 h-9 text-xs font-bold rounded-sm border-border ${wishlistFishIds.has(selectedFish.id) ? 'bg-rose-50 text-rose-500 border-rose-200 hover:bg-rose-100 hover:text-rose-600' : 'text-ink/70 hover:text-ink'}`}
                    onClick={() => toggleWishlist(selectedFish.id)}
                  >
                    {wishlistFishIds.has(selectedFish.id) ? <Heart className="w-4 h-4 mr-1 fill-current" /> : <HeartOff className="w-4 h-4 mr-1" />}
                    {wishlistFishIds.has(selectedFish.id) ? '已种草' : '加入种草清单'}
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  </div>
);
}
